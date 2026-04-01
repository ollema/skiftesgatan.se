import { CalendarDateTime, parseDate, toZoned, today } from '@internationalized/date';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { log } from '$lib/server/log';
import { notificationPreference, bookingNotification } from '$lib/server/db/notification.schema';
import { booking, timeslot } from '$lib/server/db/booking.schema';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

export function computeNotifyAt(dateStr: string, startHour: number, offsetMinutes: number): Date {
	const date = parseDate(dateStr);
	const bookingStart = new CalendarDateTime(date.year, date.month, date.day, startHour);
	const zoned = toZoned(bookingStart, TIMEZONE);
	const notifyZoned = zoned.subtract({ minutes: offsetMinutes });
	return notifyZoned.toDate();
}

export async function getNotificationPreferences(userId: string) {
	return await db
		.select({
			id: notificationPreference.id,
			resource: notificationPreference.resource,
			enabled: notificationPreference.enabled,
			offsetMinutes: notificationPreference.offsetMinutes
		})
		.from(notificationPreference)
		.where(eq(notificationPreference.userId, userId));
}

export async function setNotificationPreference(
	userId: string,
	resource: Resource,
	offsetMinutes: number,
	enabled: boolean
) {
	await db
		.insert(notificationPreference)
		.values({ userId, resource, enabled, offsetMinutes })
		.onConflictDoUpdate({
			target: [
				notificationPreference.userId,
				notificationPreference.resource,
				notificationPreference.offsetMinutes
			],
			set: { enabled }
		});

	log.info(
		`[notification] preference set userId=${userId} resource=${resource} offset=${offsetMinutes} enabled=${enabled}`
	);

	// Sync notifications for existing future bookings
	if (enabled) {
		await createNotificationsForFutureBookings(userId, resource, offsetMinutes);
	} else {
		await deletePendingNotifications(userId, resource, offsetMinutes);
	}
}

export async function createBookingNotifications(
	bookingId: number,
	userId: string,
	resource: Resource,
	dateStr: string,
	timeslotId: number
) {
	const [slot] = await db
		.select({ startHour: timeslot.startHour })
		.from(timeslot)
		.where(eq(timeslot.id, timeslotId));

	if (!slot) return;

	const prefs = await db
		.select({ offsetMinutes: notificationPreference.offsetMinutes })
		.from(notificationPreference)
		.where(
			and(
				eq(notificationPreference.userId, userId),
				eq(notificationPreference.resource, resource),
				eq(notificationPreference.enabled, true)
			)
		);

	for (const pref of prefs) {
		const notifyAt = computeNotifyAt(dateStr, slot.startHour, pref.offsetMinutes);
		await db
			.insert(bookingNotification)
			.values({
				bookingId,
				userId,
				offsetMinutes: pref.offsetMinutes,
				notifyAt
			})
			.onConflictDoNothing();
	}

	if (prefs.length > 0) {
		log.info(`[notification] created ${prefs.length} notification(s) for bookingId=${bookingId}`);
	}
}

async function createNotificationsForFutureBookings(
	userId: string,
	resource: Resource,
	offsetMinutes: number
) {
	const todayStr = today(TIMEZONE).toString();

	const futureBookings = await db
		.select({
			bookingId: booking.id,
			date: booking.date,
			startHour: timeslot.startHour
		})
		.from(booking)
		.innerJoin(timeslot, eq(booking.timeslotId, timeslot.id))
		.where(
			and(eq(booking.userId, userId), eq(booking.resource, resource), gte(booking.date, todayStr))
		);

	for (const b of futureBookings) {
		const notifyAt = computeNotifyAt(b.date, b.startHour, offsetMinutes);
		await db
			.insert(bookingNotification)
			.values({
				bookingId: b.bookingId,
				userId,
				offsetMinutes,
				notifyAt
			})
			.onConflictDoNothing();
	}
}

async function deletePendingNotifications(
	userId: string,
	resource: Resource,
	offsetMinutes: number
) {
	const todayStr = today(TIMEZONE).toString();

	const futureBookingIds = db
		.select({ id: booking.id })
		.from(booking)
		.where(
			and(eq(booking.userId, userId), eq(booking.resource, resource), gte(booking.date, todayStr))
		);

	await db
		.delete(bookingNotification)
		.where(
			and(
				inArray(bookingNotification.bookingId, futureBookingIds),
				eq(bookingNotification.offsetMinutes, offsetMinutes),
				eq(bookingNotification.status, 'pending')
			)
		);
}
