import {
	CalendarDateTime,
	type CalendarDate,
	type ZonedDateTime,
	parseDate,
	toZoned,
	now
} from '@internationalized/date';
import { eq, and, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { reminderPreference, bookingReminder } from '$lib/server/db/reminder.schema';
import { booking } from '$lib/server/db/booking.schema';
import { getTimeBlockHours } from '$lib/server/booking';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

type Db = typeof db;

type Preference = {
	id: number;
	resource: Resource;
	enabled: boolean;
	offsetMinutes: number;
};

type ReminderSchedule = {
	getPreferences(apartmentId: string): Promise<Preference[]>;
	setPreference(
		apartmentId: string,
		facility: Resource,
		offsetMinutes: number,
		enabled: boolean
	): Promise<{ scheduled: number; cancelled: number }>;
	extendForBooking(input: {
		bookingId: number;
		apartmentId: string;
		facility: Resource;
		date: CalendarDate;
		timeBlockId: number;
	}): Promise<{ scheduled: number }>;
};

function computeNotifyAt(date: CalendarDate, startHour: number, offsetMinutes: number): Date {
	const slotStart = new CalendarDateTime(date.year, date.month, date.day, startHour);
	return toZoned(slotStart, TIMEZONE).subtract({ minutes: offsetMinutes }).toDate();
}

function todayStr(zoned: ZonedDateTime): string {
	const m = String(zoned.month).padStart(2, '0');
	const d = String(zoned.day).padStart(2, '0');
	return `${zoned.year}-${m}-${d}`;
}

export function createReminderSchedule(deps: {
	db: Db;
	clock: () => ZonedDateTime;
}): ReminderSchedule {
	return {
		async getPreferences(apartmentId) {
			return await deps.db
				.select({
					id: reminderPreference.id,
					resource: reminderPreference.resource,
					enabled: reminderPreference.enabled,
					offsetMinutes: reminderPreference.offsetMinutes
				})
				.from(reminderPreference)
				.where(eq(reminderPreference.userId, apartmentId));
		},

		async setPreference(apartmentId, facility, offsetMinutes, enabled) {
			const currentNow = deps.clock();
			const today = todayStr(currentNow);
			const nowMs = currentNow.toDate().getTime();
			let scheduled = 0;
			let cancelled = 0;

			await deps.db.transaction(async (tx) => {
				await tx
					.insert(reminderPreference)
					.values({ userId: apartmentId, resource: facility, enabled, offsetMinutes })
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
								eq(booking.userId, apartmentId),
								eq(booking.resource, facility),
								gte(booking.date, today)
							)
						);

					for (const b of futureBookings) {
						const { startHour } = await getTimeBlockHours(b.timeBlockId, tx);
						const notifyAt = computeNotifyAt(parseDate(b.date), startHour, offsetMinutes);
						// Skip Bookings whose reminder window has already closed — sending a
						// reminder for a Slot that starts imminently (or has started) is noise,
						// not a reminder.
						if (notifyAt.getTime() <= nowMs) continue;
						const inserted = await tx
							.insert(bookingReminder)
							.values({
								bookingId: b.bookingId,
								userId: apartmentId,
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
								eq(booking.userId, apartmentId),
								eq(booking.resource, facility),
								gte(booking.date, today)
							)
						);

					const deleted = await tx
						.delete(bookingReminder)
						.where(
							and(
								inArray(bookingReminder.bookingId, futureBookingIds),
								eq(bookingReminder.offsetMinutes, offsetMinutes),
								eq(bookingReminder.status, 'pending')
							)
						)
						.returning();
					cancelled = deleted.length;
				}
			});

			return { scheduled, cancelled };
		},

		async extendForBooking({ bookingId, apartmentId, facility, date, timeBlockId }) {
			const currentNow = deps.clock();
			const nowMs = currentNow.toDate().getTime();
			const { startHour } = await getTimeBlockHours(timeBlockId, deps.db);

			const prefs = await deps.db
				.select({ offsetMinutes: reminderPreference.offsetMinutes })
				.from(reminderPreference)
				.where(
					and(
						eq(reminderPreference.userId, apartmentId),
						eq(reminderPreference.resource, facility),
						eq(reminderPreference.enabled, true)
					)
				);

			let scheduled = 0;
			for (const pref of prefs) {
				const notifyAt = computeNotifyAt(date, startHour, pref.offsetMinutes);
				if (notifyAt.getTime() <= nowMs) continue;
				const inserted = await deps.db
					.insert(bookingReminder)
					.values({
						bookingId,
						userId: apartmentId,
						offsetMinutes: pref.offsetMinutes,
						notifyAt
					})
					.onConflictDoNothing()
					.returning();
				scheduled += inserted.length;
			}

			return { scheduled };
		}
	};
}

export const reminderSchedule = createReminderSchedule({
	db,
	clock: () => now(TIMEZONE)
});
