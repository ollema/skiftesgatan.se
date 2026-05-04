import { CalendarDate, type ZonedDateTime } from '@internationalized/date';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, timeBlock, user } from '$lib/server/db/schema';
import type { Resource, Slot } from '$lib/types/bookings';
import { isBookingActive } from './booking';

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
 */
export async function getBookingCalendar(
	resource: Resource,
	caller: { id: string } | null,
	now: ZonedDateTime
): Promise<BookingCalendarPayload> {
	return __getBookingCalendarSnapshot(db, resource, caller, now);
}

/**
 * Test seam: same snapshot read as `getBookingCalendar` but accepts an explicit
 * database handle so PGlite-backed integration tests can drive the read.
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
