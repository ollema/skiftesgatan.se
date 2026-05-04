import { CalendarDate, now, type ZonedDateTime } from '@internationalized/date';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, timeBlock, user } from '$lib/server/db/schema';
import { TIMEZONE, type Resource, type Slot } from '$lib/types/bookings';
import { isBookingActive } from './booking';
import { bookingEvents } from './booking-events';

type BookingCalendarRow = {
	timeBlockId: number;
	startHour: number;
	endHour: number;
	date: string | null;
	bookingId: number | null;
	userId: string | null;
	username: string | null;
};

type Database = typeof db;

type BookingCalendarPayload = {
	bookingCalendar: Record<string, Slot[]>;
	activeBooking: Slot | undefined;
};

function bookingWindow(now: ZonedDateTime): { start: CalendarDate; end: CalendarDate } {
	const start = new CalendarDate(now.year, now.month, now.day);
	return { start, end: start.add({ months: 1 }) };
}

async function readBookingCalendarRows(
	database: Database,
	resource: Resource,
	now: ZonedDateTime
): Promise<BookingCalendarRow[]> {
	const { start, end } = bookingWindow(now);
	const startDate = start.toString();
	const endDate = end.toString();

	return await database
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

function assemblePayload(
	rawRows: BookingCalendarRow[],
	caller: { id: string } | null,
	now: ZonedDateTime
): BookingCalendarPayload {
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
	const { start, end } = bookingWindow(now);

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
					: b.userId === caller?.id
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
				username: exposeBooking && caller ? (b.username ?? null) : null
			});

			if (activeBooking === undefined && slotActive && b !== undefined && b.userId === caller?.id) {
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

/**
 * Snapshot read for the Booking Calendar an Apartment sees for one Facility:
 * every Slot in the Booking Window (today through today + 1 month), each
 * tagged `free` / `mine` / `other` / `past`, plus the Active Booking if any.
 *
 * Test seam: accepts an explicit database handle so PGlite-backed integration
 * tests can drive the read directly. Production callers go through
 * `watchBookingCalendar` and never see this entry point.
 */
export async function __getBookingCalendarSnapshot(
	database: Database,
	resource: Resource,
	caller: { id: string } | null,
	now: ZonedDateTime
): Promise<BookingCalendarPayload> {
	const rows = await readBookingCalendarRows(database, resource, now);
	return assemblePayload(rows, caller, now);
}

/**
 * Live read for the Booking Calendar an Apartment sees for one Facility.
 * Yields a fresh payload on subscribe and on every relevant `bookingEvents`
 * tick for the same resource. Single-flight buffering: events that fire
 * during an in-flight read coalesce into one subsequent re-yield. Owns its
 * `bookingEvents.subscribe` and unsubscribes on teardown.
 */
export function watchBookingCalendar(
	resource: Resource,
	caller: { id: string } | null
): AsyncIterableIterator<BookingCalendarPayload> {
	return __watchBookingCalendar(db, resource, caller, () => now(TIMEZONE));
}

/**
 * Test seam for `watchBookingCalendar`: same iteration semantics but accepts
 * an explicit database handle and a clock so PGlite-backed integration tests
 * can drive the live iterable deterministically.
 */
export function __watchBookingCalendar(
	database: Database,
	resource: Resource,
	caller: { id: string } | null,
	getNow: () => ZonedDateTime
): AsyncIterableIterator<BookingCalendarPayload> {
	let pending = false;
	let wake: (() => void) | undefined;
	let active = true;
	let yielded = false;

	const unsubscribe = bookingEvents.subscribe(resource, () => {
		pending = true;
		wake?.();
		wake = undefined;
	});

	const teardown = () => {
		if (!active) return;
		active = false;
		unsubscribe();
		wake?.();
		wake = undefined;
	};

	const buildPayload = () => __getBookingCalendarSnapshot(database, resource, caller, getNow());

	const done = (): IteratorResult<BookingCalendarPayload> => ({
		done: true,
		value: undefined as unknown as BookingCalendarPayload
	});

	return {
		async next(): Promise<IteratorResult<BookingCalendarPayload>> {
			if (!active) return done();

			if (!yielded) {
				yielded = true;
				const value = await buildPayload();
				if (!active) return done();
				return { done: false, value };
			}

			if (!pending) {
				await new Promise<void>((resolve) => {
					wake = resolve;
				});
			}
			if (!active) return done();
			pending = false;
			const value = await buildPayload();
			if (!active) return done();
			return { done: false, value };
		},
		async return(): Promise<IteratorResult<BookingCalendarPayload>> {
			teardown();
			return done();
		},
		async throw(err: unknown): Promise<IteratorResult<BookingCalendarPayload>> {
			teardown();
			throw err;
		},
		[Symbol.asyncIterator]() {
			return this;
		}
	};
}
