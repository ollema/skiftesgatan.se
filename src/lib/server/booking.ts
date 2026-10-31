import {
	CalendarDateTime,
	type CalendarDate,
	type ZonedDateTime,
	parseDate,
	toZoned,
	today
} from '@internationalized/date';
import { eq, and, gt, or, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { booking, timeBlock } from '#lib/server/db/schema.js';
import { findClosureForDate } from '#lib/server/closure.js';
import { TIMEZONE, type Resource } from '#lib/types/bookings.js';

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

function isUniqueViolation(e: unknown): boolean {
	if (!(e instanceof Error) || !('code' in e)) return false;
	return (
		e.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
		e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
		(e.code === 'SQLITE_CONSTRAINT' && e.message.includes('UNIQUE constraint failed'))
	);
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
 * lazy module-level cache. Per ADR-0004 the cache covers historic rows
 * (whose `(resource, startHour)` may no longer be in `TIME_BLOCKS`), which a
 * `findTimeBlock` constant lookup cannot.
 *
 * The optional `database` handle bypasses the cache and queries it directly —
 * a test seam for SQLite-backed tests that need lookups against an isolated
 * handle. A drizzle handle that exposes `.select()` qualifies (top-level `db`
 * or a transaction `tx`).
 */
export async function getTimeBlockHours(
	timeBlockId: number,
	database?: Pick<typeof db, 'select'>
): Promise<TimeBlockHours> {
	if (database) {
		const [row] = await database
			.select({
				resource: timeBlock.resource,
				startHour: timeBlock.startHour,
				endHour: timeBlock.endHour
			})
			.from(timeBlock)
			.where(eq(timeBlock.id, timeBlockId))
			.limit(1);
		if (!row) throw new Error(`unknown time block id ${timeBlockId}`);
		return { resource: row.resource, startHour: row.startHour, endHour: row.endHour };
	}
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
	| { kind: 'slot_taken'; startHour: number; endHour: number }
	| { kind: 'closed'; startHour: number; endHour: number };

class BookSlotConflict extends Error {
	constructor(public kind: 'replace_not_found' | 'already_booked' | 'slot_taken' | 'closed') {
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
	/** Test seam: drive the transaction against an isolated SQLite handle. */
	database?: typeof db;
}): Promise<BookSlotResult> {
	const database = params.database ?? db;
	// Only pass an explicit handle in tests; production reads the shared cache.
	const target = await getTimeBlockHours(params.timeBlockId, params.database);
	try {
		// Synchronous callback: better-sqlite3 commits when it returns, so every
		// statement below must stay synchronous. This transaction is also the
		// serialization point that replaces Postgres row locks (ADR-0006).
		return database.transaction((tx) => {
			// Check the closure before the replace-delete: moving a Booking into a
			// closed day must leave the original Booking intact.
			const closure = findClosureForDate(tx, params.resource, params.date.toString());
			if (closure) throw new BookSlotConflict('closed');

			const activeWhere = activeBookingWhere(params.now);
			let cancelled: CancelledSlot | null = null;

			if (params.replaceBookingId !== undefined) {
				const info = tx
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
					.limit(1)
					.get();

				if (!info) throw new BookSlotConflict('replace_not_found');

				const deleted = tx
					.delete(booking)
					.where(and(eq(booking.id, params.replaceBookingId), eq(booking.userId, params.userId)))
					.returning()
					.all();

				if (deleted.length === 0) throw new BookSlotConflict('replace_not_found');
				cancelled = info;
			} else {
				const existing = tx
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
					.limit(1)
					.get();

				if (existing) throw new BookSlotConflict('already_booked');
			}

			let created: typeof booking.$inferSelect;
			try {
				created = tx
					.insert(booking)
					.values({
						userId: params.userId,
						timeBlockId: params.timeBlockId,
						resource: params.resource,
						date: params.date.toString()
					})
					.returning()
					.get();
			} catch (e) {
				if (isUniqueViolation(e)) throw new BookSlotConflict('slot_taken');
				throw e;
			}

			return {
				kind: 'ok',
				booking: created,
				startHour: target.startHour,
				endHour: target.endHour,
				cancelled
			} as const;
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
	return db.transaction((tx) => {
		const info = tx
			.select({
				resource: booking.resource,
				date: booking.date,
				startHour: timeBlock.startHour,
				endHour: timeBlock.endHour
			})
			.from(booking)
			.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
			.where(and(eq(booking.id, bookingId), eq(booking.userId, userId), activeWhere))
			.limit(1)
			.get();
		if (!info) return null;
		const result = tx
			.delete(booking)
			.where(and(eq(booking.id, bookingId), eq(booking.userId, userId)))
			.returning()
			.all();
		if (result.length === 0) return null;
		return info;
	});
}
