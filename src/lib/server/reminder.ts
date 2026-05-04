import { CalendarDateTime, type ZonedDateTime, parseDate, toZoned } from '@internationalized/date';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { reminderPreference, bookingReminder } from '$lib/server/db/reminder.schema';
import { booking, timeBlock } from '$lib/server/db/booking.schema';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

type Database = typeof db;
// A drizzle handle that exposes `.select()` — both the top-level `db` and a
// transaction handle (`tx`) qualify. PGlite serializes all queries through one
// connection, so when we are inside `database.transaction(...)` we must use
// `tx`, never the parent `database` (the latter would deadlock).
type Selectable = Pick<Database, 'select'>;

async function lookupStartHour(database: Selectable, timeBlockId: number): Promise<number> {
	const [row] = await database
		.select({ startHour: timeBlock.startHour })
		.from(timeBlock)
		.where(eq(timeBlock.id, timeBlockId))
		.limit(1);
	if (!row) throw new Error(`unknown time block id ${timeBlockId}`);
	return row.startHour;
}

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
	enabled: boolean,
	now: ZonedDateTime,
	database: typeof db = db
): Promise<number> {
	const todayStr = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
	const nowMs = now.toDate().getTime();
	let scheduled = 0;

	await database.transaction(async (tx) => {
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
					timeBlockId: booking.timeBlockId
				})
				.from(booking)
				.where(
					and(
						eq(booking.userId, userId),
						eq(booking.resource, resource),
						gte(booking.date, todayStr)
					)
				);

			for (const b of futureBookings) {
				const startHour = await lookupStartHour(tx, b.timeBlockId);
				const notifyAt = computeNotifyAt(b.date, startHour, offsetMinutes);
				// Skip Bookings whose reminder window has already closed — sending a
				// reminder for a Slot that starts imminently (or has started) is noise,
				// not a reminder. The actor just made or held the Booking on purpose.
				if (notifyAt.getTime() <= nowMs) continue;
				const inserted = await tx
					.insert(bookingReminder)
					.values({
						bookingId: b.bookingId,
						userId,
						offsetMinutes,
						notifyAt
					})
					.onConflictDoNothing()
					.returning();
				scheduled += inserted.length;
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

	return scheduled;
}

export async function createBookingReminders(
	bookingId: number,
	userId: string,
	resource: Resource,
	dateStr: string,
	timeBlockId: number,
	now: ZonedDateTime,
	database: typeof db = db
): Promise<number> {
	const startHour = await lookupStartHour(database, timeBlockId);
	const nowMs = now.toDate().getTime();

	const prefs = await database
		.select({ offsetMinutes: reminderPreference.offsetMinutes })
		.from(reminderPreference)
		.where(
			and(
				eq(reminderPreference.userId, userId),
				eq(reminderPreference.resource, resource),
				eq(reminderPreference.enabled, true)
			)
		);

	let scheduled = 0;
	for (const pref of prefs) {
		const notifyAt = computeNotifyAt(dateStr, startHour, pref.offsetMinutes);
		// Skip preferences whose reminder window has already closed — see
		// setReminderPreference for rationale.
		if (notifyAt.getTime() <= nowMs) continue;
		const inserted = await database
			.insert(bookingReminder)
			.values({
				bookingId,
				userId,
				offsetMinutes: pref.offsetMinutes,
				notifyAt
			})
			.onConflictDoNothing()
			.returning();
		scheduled += inserted.length;
	}

	return scheduled;
}
