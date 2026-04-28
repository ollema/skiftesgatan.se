import { type CalendarDate, today } from '@internationalized/date';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, timeBlock, user } from '$lib/server/db/schema';
import { TIMEZONE, type Resource, type Slot } from '$lib/types/bookings';

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(e: unknown): boolean {
	return e instanceof Error && 'code' in e && e.code === PG_UNIQUE_VIOLATION;
}

export async function getTimeBlockStartHour(timeBlockId: number): Promise<number | null> {
	const [row] = await db
		.select({ startHour: timeBlock.startHour })
		.from(timeBlock)
		.where(eq(timeBlock.id, timeBlockId))
		.limit(1);
	return row?.startHour ?? null;
}

function maxBookingDate(from: CalendarDate = today(TIMEZONE)): CalendarDate {
	return from.add({ months: 1 });
}

type ValidateBookingDateError = 'past' | 'too_far';

export function validateBookingDate(date: CalendarDate): ValidateBookingDateError | null {
	const now = today(TIMEZONE);
	if (date.compare(now) < 0) return 'past';
	if (date.compare(maxBookingDate(now)) > 0) return 'too_far';
	return null;
}

export type BookingCalendarRow = {
	timeBlockId: number;
	startHour: number;
	endHour: number;
	date: string | null;
	bookingId: number | null;
	userId: string | null;
	username: string | null;
};

export async function getBookingCalendar(resource: Resource): Promise<BookingCalendarRow[]> {
	const startDate = today(TIMEZONE).toString();
	const endDate = maxBookingDate().toString();

	return await db
		.select({
			timeBlockId: timeBlock.id,
			startHour: timeBlock.startHour,
			endHour: timeBlock.endHour,
			date: booking.date,
			bookingId: booking.id,
			userId: booking.userId,
			username: user.username
		})
		.from(timeBlock)
		.leftJoin(
			booking,
			and(
				eq(booking.timeBlockId, timeBlock.id),
				eq(booking.resource, resource),
				gte(booking.date, startDate),
				lte(booking.date, endDate)
			)
		)
		.leftJoin(user, eq(booking.userId, user.id))
		.where(eq(timeBlock.resource, resource))
		.orderBy(timeBlock.startHour);
}

export function buildBookingPayload(
	rawRows: BookingCalendarRow[],
	user: { id: string } | null
): { bookingCalendar: Record<string, Slot[]>; activeBooking: Slot | undefined } {
	const timeBlockSet = new Map<number, { startHour: number; endHour: number }>();
	for (const row of rawRows) {
		if (!timeBlockSet.has(row.timeBlockId)) {
			timeBlockSet.set(row.timeBlockId, {
				startHour: row.startHour,
				endHour: row.endHour
			});
		}
	}
	const timeBlocks = [...timeBlockSet.entries()];

	const bookingMap = new Map<
		string,
		{ bookingId: number; userId: string; username: string | null }
	>();
	for (const row of rawRows) {
		if (row.date !== null && row.bookingId !== null) {
			bookingMap.set(`${row.date}:${row.timeBlockId}`, {
				bookingId: row.bookingId,
				userId: row.userId!,
				username: row.username
			});
		}
	}

	const start = today(TIMEZONE);
	const end = start.add({ months: 1 });

	const bookingCalendar: Record<string, Slot[]> = {};
	let activeBooking: Slot | undefined = undefined;

	let current = start;
	while (current.compare(end) <= 0) {
		const dateStr = current.toString();
		const slots: Slot[] = [];

		for (const [tid, tb] of timeBlocks) {
			const b = bookingMap.get(`${dateStr}:${tid}`);
			const status = b === undefined ? 'free' : b.userId === user?.id ? 'mine' : 'other';

			slots.push({
				timeBlockId: tid,
				date: current,
				start: tb.startHour,
				end: tb.endHour,
				status,
				bookingId: b?.bookingId ?? null,
				username: user ? (b?.username ?? null) : null
			});

			if (activeBooking === undefined && b !== undefined && b.userId === user?.id) {
				activeBooking = {
					timeBlockId: tid,
					date: current,
					start: tb.startHour,
					end: tb.endHour,
					status,
					bookingId: b.bookingId,
					username: b.username
				};
			}
		}

		bookingCalendar[dateStr] = slots;
		current = current.add({ days: 1 });
	}

	return { bookingCalendar, activeBooking };
}

type BookSlotResult =
	| {
			kind: 'ok';
			booking: typeof booking.$inferSelect;
			cancelled: { resource: Resource; date: string; startHour: number } | null;
	  }
	| { kind: 'replace_not_found' }
	| { kind: 'already_booked' }
	| { kind: 'slot_taken' };

class BookSlotConflict extends Error {
	constructor(public kind: 'replace_not_found' | 'already_booked' | 'slot_taken') {
		super(kind);
	}
}

export async function bookSlot(params: {
	userId: string;
	timeBlockId: number;
	resource: Resource;
	date: CalendarDate;
	replaceBookingId?: number;
}): Promise<BookSlotResult> {
	try {
		return await db.transaction(async (tx) => {
			// Serialize concurrent booking attempts by the same user. Without this lock,
			// two requests can both pass the existing-booking check and both insert,
			// breaking the one-active-booking-per-user-per-resource rule.
			await tx.select({ id: user.id }).from(user).where(eq(user.id, params.userId)).for('update');

			const todayStr = today(TIMEZONE).toString();
			let cancelled: { resource: Resource; date: string; startHour: number } | null = null;

			if (params.replaceBookingId !== undefined) {
				const [info] = await tx
					.select({
						resource: booking.resource,
						date: booking.date,
						startHour: timeBlock.startHour
					})
					.from(booking)
					.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
					.where(
						and(
							eq(booking.id, params.replaceBookingId),
							eq(booking.userId, params.userId),
							gte(booking.date, todayStr)
						)
					)
					.limit(1);

				if (!info) throw new BookSlotConflict('replace_not_found');

				const deleted = await tx
					.delete(booking)
					.where(
						and(
							eq(booking.id, params.replaceBookingId),
							eq(booking.userId, params.userId),
							gte(booking.date, todayStr)
						)
					)
					.returning();

				if (deleted.length === 0) throw new BookSlotConflict('replace_not_found');
				cancelled = info;
			} else {
				const existing = await tx
					.select({ id: booking.id })
					.from(booking)
					.where(
						and(
							eq(booking.userId, params.userId),
							eq(booking.resource, params.resource),
							gte(booking.date, todayStr)
						)
					)
					.limit(1);

				if (existing.length > 0) throw new BookSlotConflict('already_booked');
			}

			try {
				const [created] = await tx
					.insert(booking)
					.values({
						userId: params.userId,
						timeBlockId: params.timeBlockId,
						resource: params.resource,
						date: params.date.toString()
					})
					.returning();

				return { kind: 'ok', booking: created, cancelled };
			} catch (e) {
				if (isUniqueViolation(e)) throw new BookSlotConflict('slot_taken');
				throw e;
			}
		});
	} catch (e) {
		if (e instanceof BookSlotConflict) return { kind: e.kind };
		throw e;
	}
}

export async function cancelBooking(
	bookingId: number,
	userId: string
): Promise<{ resource: Resource; date: string; startHour: number } | null> {
	const todayStr = today(TIMEZONE).toString();
	const [info] = await db
		.select({
			resource: booking.resource,
			date: booking.date,
			startHour: timeBlock.startHour
		})
		.from(booking)
		.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
		.where(and(eq(booking.id, bookingId), eq(booking.userId, userId), gte(booking.date, todayStr)))
		.limit(1);
	if (!info) return null;
	const result = await db
		.delete(booking)
		.where(and(eq(booking.id, bookingId), eq(booking.userId, userId), gte(booking.date, todayStr)))
		.returning();
	if (result.length === 0) return null;
	return info;
}
