import { CalendarDateTime, parseDate, toZoned, today } from '@internationalized/date';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { reminderPreference, bookingReminder } from '$lib/server/db/reminder.schema';
import { booking, timeBlock } from '$lib/server/db/booking.schema';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

export function computeNotifyAt(dateStr: string, startHour: number, offsetMinutes: number): Date {
	const date = parseDate(dateStr);
	const bookingStart = new CalendarDateTime(date.year, date.month, date.day, startHour);
	const zoned = toZoned(bookingStart, TIMEZONE);
	const notifyZoned = zoned.subtract({ minutes: offsetMinutes });
	return notifyZoned.toDate();
}

export async function getReminderPreferences(userId: string) {
	return await db
		.select({
			id: reminderPreference.id,
			resource: reminderPreference.resource,
			enabled: reminderPreference.enabled,
			offsetMinutes: reminderPreference.offsetMinutes
		})
		.from(reminderPreference)
		.where(eq(reminderPreference.userId, userId));
}

export async function setReminderPreference(
	userId: string,
	resource: Resource,
	offsetMinutes: number,
	enabled: boolean
) {
	const todayStr = today(TIMEZONE).toString();

	await db.transaction(async (tx) => {
		await tx
			.insert(reminderPreference)
			.values({ userId, resource, enabled, offsetMinutes })
			.onConflictDoUpdate({
				target: [
					reminderPreference.userId,
					reminderPreference.resource,
					reminderPreference.offsetMinutes
				],
				set: { enabled }
			});

		if (enabled) {
			const futureBookings = await tx
				.select({
					bookingId: booking.id,
					date: booking.date,
					startHour: timeBlock.startHour
				})
				.from(booking)
				.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
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
					.insert(bookingReminder)
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
				.delete(bookingReminder)
				.where(
					and(
						inArray(bookingReminder.bookingId, futureBookingIds),
						eq(bookingReminder.offsetMinutes, offsetMinutes),
						eq(bookingReminder.status, 'pending')
					)
				);
		}
	});
}

export async function createBookingReminders(
	bookingId: number,
	userId: string,
	resource: Resource,
	dateStr: string,
	timeBlockId: number
): Promise<number> {
	const [block] = await db
		.select({ startHour: timeBlock.startHour })
		.from(timeBlock)
		.where(eq(timeBlock.id, timeBlockId));

	if (!block) return 0;

	const prefs = await db
		.select({ offsetMinutes: reminderPreference.offsetMinutes })
		.from(reminderPreference)
		.where(
			and(
				eq(reminderPreference.userId, userId),
				eq(reminderPreference.resource, resource),
				eq(reminderPreference.enabled, true)
			)
		);

	for (const pref of prefs) {
		const notifyAt = computeNotifyAt(dateStr, block.startHour, pref.offsetMinutes);
		await db
			.insert(bookingReminder)
			.values({
				bookingId,
				userId,
				offsetMinutes: pref.offsetMinutes,
				notifyAt
			})
			.onConflictDoNothing();
	}

	return prefs.length;
}
