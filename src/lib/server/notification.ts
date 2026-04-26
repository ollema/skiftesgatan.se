import { CalendarDateTime, parseDate, toZoned, today } from '@internationalized/date';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { log } from '$lib/server/log';
import { notificationPreference, bookingNotification } from '$lib/server/db/notification.schema';
import { booking, timeslot } from '$lib/server/db/booking.schema';
import { user } from '$lib/server/db/auth.schema';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

async function lookupUsername(userId: string): Promise<string | null> {
	const [row] = await db
		.select({ username: user.username })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	return row?.username ?? null;
}

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
	const todayStr = today(TIMEZONE).toString();

	await db.transaction(async (tx) => {
		await tx
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

		if (enabled) {
			const futureBookings = await tx
				.select({
					bookingId: booking.id,
					date: booking.date,
					startHour: timeslot.startHour
				})
				.from(booking)
				.innerJoin(timeslot, eq(booking.timeslotId, timeslot.id))
				.where(
					and(
						eq(booking.userId, userId),
						eq(booking.resource, resource),
						gte(booking.date, todayStr)
					)
				);

			for (const b of futureBookings) {
				const notifyAt = computeNotifyAt(b.date, b.startHour, offsetMinutes);
				await tx
					.insert(bookingNotification)
					.values({
						bookingId: b.bookingId,
						userId,
						offsetMinutes,
						notifyAt
					})
					.onConflictDoNothing();
			}
		} else {
			const futureBookingIds = tx
				.select({ id: booking.id })
				.from(booking)
				.where(
					and(
						eq(booking.userId, userId),
						eq(booking.resource, resource),
						gte(booking.date, todayStr)
					)
				);

			await tx
				.delete(bookingNotification)
				.where(
					and(
						inArray(bookingNotification.bookingId, futureBookingIds),
						eq(bookingNotification.offsetMinutes, offsetMinutes),
						eq(bookingNotification.status, 'pending')
					)
				);
		}
	});

	const username = await lookupUsername(userId);
	log.info(
		`[notification] preference set username=${username} resource=${resource} offset=${offsetMinutes} enabled=${enabled}`
	);
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
		const username = await lookupUsername(userId);
		log.info(
			`[notification] created ${prefs.length} reminder(s) username=${username} resource=${resource} date=${dateStr} startHour=${slot.startHour}`
		);
	}
}
