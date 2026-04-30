import { describe, it, expect } from 'vitest';
import { CalendarDateTime, toZoned, today } from '@internationalized/date';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { TIMEZONE, TIME_BLOCKS } from '$lib/types/bookings';
import * as schema from './db/schema';
import { timeBlock } from './db/booking.schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import {
	activeBookingWhere,
	buildBookingPayload,
	isBookingActive,
	validateBookingDate,
	__buildTimeBlockMap,
	type BookingCalendarRow
} from './booking';

describe('TIME_BLOCKS drift', () => {
	it('seedTimeBlocks inserts every entry of TIME_BLOCKS as a time_block row', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			// pushSchema's type signature is restrictive about the db generic; the
			// runtime behaviour is correct, so cast through `unknown` here.
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			await seedTimeBlocks(db);

			const rows = await db.select().from(timeBlock);

			for (const [resource, blocks] of Object.entries(TIME_BLOCKS)) {
				for (const block of blocks) {
					expect(rows).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								resource,
								startHour: block.startHour,
								endHour: block.endHour
							})
						])
					);
				}
			}
		} finally {
			await client.close();
		}
	});

	it('preserves historic time_block rows that are not in the current TIME_BLOCKS (inclusion, not equality)', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			// pushSchema's type signature is restrictive about the db generic; the
			// runtime behaviour is correct, so cast through `unknown` here.
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			// Pre-insert a historic row whose (resource, startHour) is not in the current schedule.
			await db.insert(timeBlock).values({ resource: 'laundry_room', startHour: 8, endHour: 11 });

			await seedTimeBlocks(db);

			const rows = await db.select().from(timeBlock);
			expect(rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ resource: 'laundry_room', startHour: 8, endHour: 11 })
				])
			);
		} finally {
			await client.close();
		}
	});
});

describe('time block cache', () => {
	it('builds a map from time_block id to (resource, startHour, endHour) covering the current schedule', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			await seedTimeBlocks(db);

			const map = await __buildTimeBlockMap(db);

			const rows = await db.select().from(timeBlock);
			for (const row of rows) {
				expect(map.get(row.id)).toEqual({
					resource: row.resource,
					startHour: row.startHour,
					endHour: row.endHour
				});
			}
			for (const [resource, blocks] of Object.entries(TIME_BLOCKS)) {
				for (const block of blocks) {
					const row = rows.find(
						(r) =>
							r.resource === resource &&
							r.startHour === block.startHour &&
							r.endHour === block.endHour
					);
					expect(
						row,
						`seeded row for ${resource} ${block.startHour}-${block.endHour}`
					).toBeDefined();
					expect(map.get(row!.id)).toEqual({
						resource,
						startHour: block.startHour,
						endHour: block.endHour
					});
				}
			}
		} finally {
			await client.close();
		}
	});

	it('resolves a historic time_block row whose (resource, startHour) is not in the current TIME_BLOCKS', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			const [historic] = await db
				.insert(timeBlock)
				.values({ resource: 'laundry_room', startHour: 8, endHour: 11 })
				.returning();

			await seedTimeBlocks(db);

			const map = await __buildTimeBlockMap(db);

			expect(map.get(historic.id)).toEqual({
				resource: 'laundry_room',
				startHour: 8,
				endHour: 11
			});
		} finally {
			await client.close();
		}
	});
});

describe('isBookingActive', () => {
	// Slot 10–13 on 2026-04-15 in Europe/Stockholm. slotEnd = 2026-04-15 13:00:00.
	const booking = { date: '2026-04-15', endHour: 13 };

	function stockholmZdt(year: number, month: number, day: number, h: number, m: number, s = 0) {
		return toZoned(new CalendarDateTime(year, month, day, h, m, s), TIMEZONE);
	}

	it('is Active at slotEnd - 1min', () => {
		const now = stockholmZdt(2026, 4, 15, 12, 59, 0);
		expect(isBookingActive(booking, now)).toBe(true);
	});

	it('is not Active at slotEnd exactly', () => {
		const now = stockholmZdt(2026, 4, 15, 13, 0, 0);
		expect(isBookingActive(booking, now)).toBe(false);
	});

	it('is not Active at slotEnd + 1min', () => {
		const now = stockholmZdt(2026, 4, 15, 13, 1, 0);
		expect(isBookingActive(booking, now)).toBe(false);
	});

	it('is Active when the Booking date is strictly in the future', () => {
		const now = stockholmZdt(2026, 4, 15, 23, 59, 59);
		expect(isBookingActive({ date: '2026-04-16', endHour: 7 }, now)).toBe(true);
	});

	it('is not Active when the Booking date is strictly in the past', () => {
		const now = stockholmZdt(2026, 4, 15, 0, 0, 0);
		expect(isBookingActive({ date: '2026-04-14', endHour: 22 }, now)).toBe(false);
	});
});

describe('activeBookingWhere', () => {
	function stockholmZdt(year: number, month: number, day: number, h: number, m: number, s = 0) {
		return toZoned(new CalendarDateTime(year, month, day, h, m, s), TIMEZONE);
	}

	// The predicate is consumed by drizzle-orm; we rely on its queryChunks
	// param values for behavioural assertions. Drizzle stores user-supplied
	// values as `Param` instances whose `value` field is the bound value.
	function paramValues(expr: ReturnType<typeof activeBookingWhere>): unknown[] {
		const out: unknown[] = [];
		function walk(node: unknown): void {
			if (node === null || typeof node !== 'object') return;
			const obj = node as Record<string, unknown>;
			if ('value' in obj && !('queryChunks' in obj) && !('table' in obj)) {
				out.push(obj.value);
				return;
			}
			if ('queryChunks' in obj && Array.isArray(obj.queryChunks)) {
				for (const c of obj.queryChunks) walk(c);
			}
		}
		walk(expr);
		return out;
	}

	it('parameterizes the predicate with today date string and current hour', () => {
		const now = stockholmZdt(2026, 4, 15, 12, 30, 0);
		const params = paramValues(activeBookingWhere(now));
		expect(params).toContain('2026-04-15');
		expect(params).toContain(12);
	});

	it('uses now.hour even at HH:00:00 boundary so endHour=HH is excluded', () => {
		const now = stockholmZdt(2026, 4, 15, 13, 0, 0);
		const params = paramValues(activeBookingWhere(now));
		expect(params).toContain(13);
	});
});

describe('validateBookingDate', () => {
	const now = today(TIMEZONE);

	it('accepts today', () => {
		expect(validateBookingDate(now)).toBeNull();
	});

	it('accepts tomorrow', () => {
		expect(validateBookingDate(now.add({ days: 1 }))).toBeNull();
	});

	it('accepts one month from now', () => {
		expect(validateBookingDate(now.add({ months: 1 }))).toBeNull();
	});

	it('returns "past" for yesterday', () => {
		expect(validateBookingDate(now.subtract({ days: 1 }))).toBe('past');
	});

	it('returns "too_far" for more than one month from now', () => {
		expect(validateBookingDate(now.add({ months: 1, days: 1 }))).toBe('too_far');
	});
});

describe('buildBookingPayload', () => {
	const me = { id: 'apt-A1001' };
	const someoneElse = { id: 'apt-B2002' };
	const start = today(TIMEZONE);
	const end = start.add({ months: 1 });
	const startStr = start.toString();
	const endStr = end.toString();
	// `now` defaults to start-of-today so existing tests behave identically to the
	// previous `today(TIMEZONE)`-based implementation.
	const startOfToday = toZoned(
		new CalendarDateTime(start.year, start.month, start.day, 0, 0, 0),
		TIMEZONE
	);
	const callBuild = (rows: BookingCalendarRow[], user: { id: string } | null) =>
		buildBookingPayload(rows, user, startOfToday);

	function expectedDateStrings(): string[] {
		const dates: string[] = [];
		let d = start;
		while (d.compare(end) <= 0) {
			dates.push(d.toString());
			d = d.add({ days: 1 });
		}
		return dates;
	}

	it('returns an empty slot array per day in the Booking Window when there are no time blocks', () => {
		const { bookingCalendar, activeBooking } = callBuild([], me);

		const dates = expectedDateStrings();
		expect(Object.keys(bookingCalendar).sort()).toEqual([...dates].sort());
		for (const d of dates) {
			expect(bookingCalendar[d]).toEqual([]);
		}
		expect(activeBooking).toBeUndefined();
	});

	it('marks every Slot free when no Apartment has booked anything', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			}
		];

		const { bookingCalendar, activeBooking } = callBuild(rows, me);

		const dates = expectedDateStrings();
		for (const d of dates) {
			expect(bookingCalendar[d]).toHaveLength(1);
			const slot = bookingCalendar[d][0];
			expect(slot.status).toBe('free');
			expect(slot.bookingId).toBeNull();
			expect(slot.username).toBeNull();
			expect(slot.start).toBe(7);
			expect(slot.end).toBe(10);
			expect(slot.timeBlockId).toBe(1);
		}
		expect(activeBooking).toBeUndefined();
	});

	it('tags the calling Apartment\'s Slot as "mine" and surfaces it as activeBooking', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 42,
				userId: me.id,
				username: 'A1001'
			}
		];

		const { bookingCalendar, activeBooking } = callBuild(rows, me);

		const todaySlot = bookingCalendar[startStr][0];
		expect(todaySlot.status).toBe('mine');
		expect(todaySlot.bookingId).toBe(42);
		expect(todaySlot.username).toBe('A1001');

		expect(activeBooking).toBeDefined();
		expect(activeBooking?.bookingId).toBe(42);
		expect(activeBooking?.status).toBe('mine');
		expect(activeBooking?.date.toString()).toBe(startStr);
	});

	it('picks the earliest Slot as activeBooking when the Apartment has multiple Bookings in the rows', () => {
		const laterStr = start.add({ days: 5 }).toString();
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: laterStr,
				bookingId: 99,
				userId: me.id,
				username: 'A1001'
			},
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 42,
				userId: me.id,
				username: 'A1001'
			}
		];

		const { activeBooking } = callBuild(rows, me);

		expect(activeBooking?.bookingId).toBe(42);
		expect(activeBooking?.date.toString()).toBe(startStr);
	});

	it('tags another Apartment\'s Slot as "other" and exposes their username to a signed-in caller', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 7,
				userId: someoneElse.id,
				username: 'B2002'
			}
		];

		const { bookingCalendar, activeBooking } = callBuild(rows, me);

		const slot = bookingCalendar[startStr][0];
		expect(slot.status).toBe('other');
		expect(slot.bookingId).toBe(7);
		expect(slot.username).toBe('B2002');
		expect(activeBooking).toBeUndefined();
	});

	it('hides usernames from anonymous callers but still tags Slots as "other"', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 7,
				userId: someoneElse.id,
				username: 'B2002'
			}
		];

		const { bookingCalendar, activeBooking } = callBuild(rows, null);

		const slot = bookingCalendar[startStr][0];
		expect(slot.status).toBe('other');
		expect(slot.bookingId).toBe(7);
		expect(slot.username).toBeNull();
		expect(activeBooking).toBeUndefined();
	});

	it('covers every day from today through today + 1 month and reflects bookings at both ends of the Window', () => {
		const midStr = start.add({ days: 7 }).toString();
		const rows: BookingCalendarRow[] = [
			// Five laundry-room time blocks — emit one row per block as the "no booking" baseline
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 2,
				startHour: 10,
				endHour: 13,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 3,
				startHour: 13,
				endHour: 16,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 4,
				startHour: 16,
				endHour: 19,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 5,
				startHour: 19,
				endHour: 22,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			// Today: another Apartment claimed the 10–13 Slot
			{
				timeBlockId: 2,
				startHour: 10,
				endHour: 13,
				date: startStr,
				bookingId: 100,
				userId: someoneElse.id,
				username: 'B2002'
			},
			// One week in: the calling Apartment booked 13–16
			{
				timeBlockId: 3,
				startHour: 13,
				endHour: 16,
				date: midStr,
				bookingId: 101,
				userId: me.id,
				username: 'A1001'
			},
			// Far end of the window: another Apartment booked 19–22
			{
				timeBlockId: 5,
				startHour: 19,
				endHour: 22,
				date: endStr,
				bookingId: 102,
				userId: someoneElse.id,
				username: 'B2002'
			}
		];

		const { bookingCalendar, activeBooking } = callBuild(rows, me);

		const dates = expectedDateStrings();
		expect(Object.keys(bookingCalendar)).toHaveLength(dates.length);
		expect(bookingCalendar[startStr]).toBeDefined();
		expect(bookingCalendar[endStr]).toBeDefined();

		for (const d of dates) {
			expect(bookingCalendar[d]).toHaveLength(5);
			expect(bookingCalendar[d].map((s) => s.start)).toEqual([7, 10, 13, 16, 19]);
		}

		const todaySlots = bookingCalendar[startStr];
		expect(todaySlots[0].status).toBe('free');
		expect(todaySlots[1].status).toBe('other');
		expect(todaySlots[1].bookingId).toBe(100);
		expect(todaySlots[1].username).toBe('B2002');

		const midSlots = bookingCalendar[midStr];
		expect(midSlots[2].status).toBe('mine');
		expect(midSlots[2].bookingId).toBe(101);

		const endSlots = bookingCalendar[endStr];
		expect(endSlots[4].status).toBe('other');
		expect(endSlots[4].bookingId).toBe(102);

		expect(activeBooking?.bookingId).toBe(101);
		expect(activeBooking?.date.toString()).toBe(midStr);
	});

	describe('past-end slots on today (slot-end-grain)', () => {
		// Pin `now` to today at 13:30 in Stockholm. The 07–10 and 10–13 Slots have
		// passed; 13–16, 16–19, 19–22 are still bookable.
		const now1330 = toZoned(
			new CalendarDateTime(start.year, start.month, start.day, 13, 30, 0),
			TIMEZONE
		);

		const fiveLaundryBlocks: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 2,
				startHour: 10,
				endHour: 13,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 3,
				startHour: 13,
				endHour: 16,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 4,
				startHour: 16,
				endHour: 19,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 5,
				startHour: 19,
				endHour: 22,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			}
		];

		it('marks today\'s past-end Slots as "past" with no Booking info exposed', () => {
			const rows: BookingCalendarRow[] = [
				...fiveLaundryBlocks,
				{
					timeBlockId: 2,
					startHour: 10,
					endHour: 13,
					date: startStr,
					bookingId: 500,
					userId: someoneElse.id,
					username: 'B2002'
				}
			];

			const { bookingCalendar } = buildBookingPayload(rows, me, now1330);

			const todaySlots = bookingCalendar[startStr];
			expect(todaySlots[0].status).toBe('past');
			expect(todaySlots[0].bookingId).toBeNull();
			expect(todaySlots[0].username).toBeNull();
			expect(todaySlots[1].status).toBe('past');
			expect(todaySlots[1].bookingId).toBeNull();
			expect(todaySlots[1].username).toBeNull();
			// 13–16 just-ended boundary: at 13:30 it's still active (endHour 16 > 13).
			expect(todaySlots[2].status).toBe('free');
			expect(todaySlots[3].status).toBe('free');
			expect(todaySlots[4].status).toBe('free');
		});

		it('does not surface a Historical Booking as activeBooking', () => {
			const rows: BookingCalendarRow[] = [
				...fiveLaundryBlocks,
				{
					timeBlockId: 2,
					startHour: 10,
					endHour: 13,
					date: startStr,
					bookingId: 600,
					userId: me.id,
					username: 'A1001'
				}
			];

			const { bookingCalendar, activeBooking } = buildBookingPayload(rows, me, now1330);

			// My past-end Booking is invisible: slot is 'past', activeBooking undefined.
			expect(bookingCalendar[startStr][1].status).toBe('past');
			expect(bookingCalendar[startStr][1].bookingId).toBeNull();
			expect(activeBooking).toBeUndefined();
		});

		it('still surfaces a future-slot Booking as activeBooking even if there is a Historical one earlier today', () => {
			const tomorrowStr = start.add({ days: 1 }).toString();
			const rows: BookingCalendarRow[] = [
				...fiveLaundryBlocks,
				{
					timeBlockId: 2,
					startHour: 10,
					endHour: 13,
					date: startStr,
					bookingId: 700,
					userId: me.id,
					username: 'A1001'
				},
				{
					timeBlockId: 1,
					startHour: 7,
					endHour: 10,
					date: tomorrowStr,
					bookingId: 701,
					userId: me.id,
					username: 'A1001'
				}
			];

			const { activeBooking } = buildBookingPayload(rows, me, now1330);

			expect(activeBooking?.bookingId).toBe(701);
			expect(activeBooking?.date.toString()).toBe(tomorrowStr);
		});
	});
});
