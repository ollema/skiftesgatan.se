import {
	CalendarDateTime,
	type CalendarDate,
	type ZonedDateTime,
	parseDate,
	toZoned,
	today
} from '@internationalized/date';
import { eq, and, gt, gte, lte, or, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, timeBlock, user } from '$lib/server/db/schema';
import { TIMEZONE, type Resource, type Slot } from '$lib/types/bookings';

export function isBookingActive(b: { date: string; endHour: number }, now: ZonedDateTime): boolean {
	const d = parseDate(b.date);
	const slotEnd = toZoned(new CalendarDateTime(d.year, d.month, d.day, b.endHour), TIMEZONE);
	return slotEnd.compare(now) > 0;
}

function pad2(n: number): string {
	return n.toString().padStart(2, '0');
}

function nowDateStr(now: ZonedDateTime): string {
	return `${now.year}-${pad2(now.month)}-${pad2(now.day)}`;
}

export function activeBookingWhere(now: ZonedDateTime): SQL {
	const todayStr = nowDateStr(now);
	// SlotEnd > now ⇔ either the Booking is on a strictly-future date, or it is
	// on today and its endHour exceeds the current hour. Endhours are integer
	// hours (≤ 22), so comparing to `now.hour` correctly excludes a slot that
	// just ended at HH:00:00 (then `now.hour === HH`, so `endHour > HH` fails).
	return or(
		gt(booking.date, todayStr),
		and(eq(booking.date, todayStr), gt(timeBlock.endHour, now.hour))
	) as SQL;
}

const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(e: unknown): boolean {
	return e instanceof Error && 'code' in e && e.code === PG_UNIQUE_VIOLATION;
}

type TimeBlockHours = { resource: Resource; startHour: number; endHour: number };

// Module-private lazy cache. Concurrent callers race the synchronous `??=`
// assignment and end up sharing the same in-flight Promise — see ADR-0004 for
// why historic time_block rows must resolve through this cache.
let timeBlockCachePromise: Promise<Map<number, TimeBlockHours>> | undefined;

export async function __buildTimeBlockMap(
	database: typeof db
): Promise<Map<number, TimeBlockHours>> {
	const rows = await database
		.select({
			id: timeBlock.id,
			resource: timeBlock.resource,
			startHour: timeBlock.startHour,
			endHour: timeBlock.endHour
		})
		.from(timeBlock);
	return new Map(
		rows.map((r) => [r.id, { resource: r.resource, startHour: r.startHour, endHour: r.endHour }])
	);
}

/**
 * Resolves a `time_block_id` to its `(resource, startHour, endHour)` via a
 * lazy module-level cache. Used internally by `bookSlot`; exported for the
 * follow-up slice of #34 that drops `innerJoin(timeBlock, ...)` from
 * `reminder.ts` / `reminder.scheduler.ts` / `calendar.ts` and resolves a
 * Booking's hours through this cache instead. Per ADR-0004 the cache covers
 * historic rows (whose `(resource, startHour)` may no longer be in
 * `TIME_BLOCKS`), which a `findTimeBlock` constant lookup cannot.
 *
 * @lintignore
 */
export async function getTimeBlockHours(timeBlockId: number): Promise<TimeBlockHours> {
	timeBlockCachePromise ??= __buildTimeBlockMap(db);
	const map = await timeBlockCachePromise;
	const hours = map.get(timeBlockId);
	if (!hours) throw new Error(`unknown time block id ${timeBlockId}`);
	return hours;
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
	user: { id: string } | null,
	now: ZonedDateTime
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

	// Date-grain stays for "show all of today's Slots" — past Slots from earlier
	// today remain visible as a non-interactive 'past' status.
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
			const slotActive = isBookingActive({ date: dateStr, endHour: tb.endHour }, now);
			const status: Slot['status'] = !slotActive
				? 'past'
				: b === undefined
					? 'free'
					: b.userId === user?.id
						? 'mine'
						: 'other';

			// Past-end slots: Historical Bookings are invisible on user-facing
			// surfaces. The cell stays in the grid but exposes no Booking info.
			const exposeBooking = slotActive && b !== undefined;

			slots.push({
				timeBlockId: tid,
				date: current,
				start: tb.startHour,
				end: tb.endHour,
				status,
				bookingId: exposeBooking ? b.bookingId : null,
				username: exposeBooking && user ? (b.username ?? null) : null
			});

			if (activeBooking === undefined && slotActive && b !== undefined && b.userId === user?.id) {
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

type CancelledSlot = {
	resource: Resource;
	date: string;
	startHour: number;
	endHour: number;
};

type BookSlotResult =
	| {
			kind: 'ok';
			booking: typeof booking.$inferSelect;
			startHour: number;
			endHour: number;
			cancelled: CancelledSlot | null;
	  }
	| { kind: 'replace_not_found'; startHour: number; endHour: number }
	| { kind: 'already_booked'; startHour: number; endHour: number }
	| { kind: 'slot_taken'; startHour: number; endHour: number };

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
	now: ZonedDateTime;
}): Promise<BookSlotResult> {
	const target = await getTimeBlockHours(params.timeBlockId);
	try {
		return await db.transaction(async (tx) => {
			// Serialize concurrent booking attempts by the same user. Without this lock,
			// two requests can both pass the existing-booking check and both insert,
			// breaking the one-active-booking-per-user-per-resource rule.
			await tx.select({ id: user.id }).from(user).where(eq(user.id, params.userId)).for('update');

			const activeWhere = activeBookingWhere(params.now);
			let cancelled: CancelledSlot | null = null;

			if (params.replaceBookingId !== undefined) {
				const [info] = await tx
					.select({
						resource: booking.resource,
						date: booking.date,
						startHour: timeBlock.startHour,
						endHour: timeBlock.endHour
					})
					.from(booking)
					.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
					.where(
						and(
							eq(booking.id, params.replaceBookingId),
							eq(booking.userId, params.userId),
							activeWhere
						)
					)
					.limit(1);

				if (!info) throw new BookSlotConflict('replace_not_found');

				const deleted = await tx
					.delete(booking)
					.where(and(eq(booking.id, params.replaceBookingId), eq(booking.userId, params.userId)))
					.returning();

				if (deleted.length === 0) throw new BookSlotConflict('replace_not_found');
				cancelled = info;
			} else {
				const existing = await tx
					.select({ id: booking.id })
					.from(booking)
					.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
					.where(
						and(
							eq(booking.userId, params.userId),
							eq(booking.resource, params.resource),
							activeWhere
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

				return {
					kind: 'ok',
					booking: created,
					startHour: target.startHour,
					endHour: target.endHour,
					cancelled
				};
			} catch (e) {
				if (isUniqueViolation(e)) throw new BookSlotConflict('slot_taken');
				throw e;
			}
		});
	} catch (e) {
		if (e instanceof BookSlotConflict) {
			return { kind: e.kind, startHour: target.startHour, endHour: target.endHour };
		}
		throw e;
	}
}

export async function cancelBooking(
	bookingId: number,
	userId: string,
	now: ZonedDateTime
): Promise<CancelledSlot | null> {
	const activeWhere = activeBookingWhere(now);
	const [info] = await db
		.select({
			resource: booking.resource,
			date: booking.date,
			startHour: timeBlock.startHour,
			endHour: timeBlock.endHour
		})
		.from(booking)
		.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
		.where(and(eq(booking.id, bookingId), eq(booking.userId, userId), activeWhere))
		.limit(1);
	if (!info) return null;
	const result = await db
		.delete(booking)
		.where(and(eq(booking.id, bookingId), eq(booking.userId, userId)))
		.returning();
	if (result.length === 0) return null;
	return info;
}
