import { describe, it, expect } from 'vitest';
import { CalendarDateTime, toZoned, today } from '@internationalized/date';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { and, eq } from 'drizzle-orm';
import { TIMEZONE, type Resource } from '$lib/types/bookings';
import * as schema from './db/schema';
import { booking, timeBlock, user } from './db/schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import { __getBookingCalendarSnapshot } from './booking-calendar';

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function makeTestDb(): Promise<{ client: PGlite; db: TestDb }> {
	const client = new PGlite();
	const db = drizzle(client, { schema });
	const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
	await pushed.apply();
	return { client, db };
}

async function insertUser(db: TestDb, id: string, username: string): Promise<void> {
	await db.insert(user).values({
		id,
		name: username,
		email: `${username}@example.com`,
		username,
		displayUsername: username
	});
}

async function timeBlockId(
	db: TestDb,
	resource: Resource,
	startHour: number,
	endHour: number
): Promise<number> {
	const rows = await db
		.select({ id: timeBlock.id })
		.from(timeBlock)
		.where(
			and(
				eq(timeBlock.resource, resource),
				eq(timeBlock.startHour, startHour),
				eq(timeBlock.endHour, endHour)
			)
		);
	if (rows.length === 0) {
		throw new Error(`no time_block for ${resource} ${startHour}-${endHour}`);
	}
	return rows[0].id;
}

async function insertBooking(
	db: TestDb,
	opts: {
		userId: string;
		timeBlockId: number;
		resource: Resource;
		date: string;
	}
): Promise<number> {
	const [row] = await db.insert(booking).values(opts).returning({ id: booking.id });
	return row.id;
}

const me = { id: 'apt-A1001' };
const other = { id: 'apt-B2002' };

const start = today(TIMEZONE);
const end = start.add({ months: 1 });
const startStr = start.toString();
const endStr = end.toString();

const startOfToday = toZoned(
	new CalendarDateTime(start.year, start.month, start.day, 0, 0, 0),
	TIMEZONE
);

function expectedDates(): string[] {
	const dates: string[] = [];
	let d = start;
	while (d.compare(end) <= 0) {
		dates.push(d.toString());
		d = d.add({ days: 1 });
	}
	return dates;
}

describe('getBookingCalendar', () => {
	it('returns an empty Slot[] per day in the Booking Window when no time_block rows exist', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, me.id, 'A1001');

			const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				me,
				startOfToday
			);

			const dates = expectedDates();
			expect(Object.keys(bookingCalendar).sort()).toEqual([...dates].sort());
			for (const d of dates) {
				expect(bookingCalendar[d]).toEqual([]);
			}
			expect(activeBooking).toBeUndefined();
		} finally {
			await client.close();
		}
	});

	it('marks every Slot free when no Apartment has booked anything', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedTimeBlocks(db);
			await insertUser(db, me.id, 'A1001');

			const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				me,
				startOfToday
			);

			const dates = expectedDates();
			for (const d of dates) {
				expect(bookingCalendar[d]).toHaveLength(5);
				for (const slot of bookingCalendar[d]) {
					expect(slot.status).toBe('free');
					expect(slot.bookingId).toBeNull();
					expect(slot.username).toBeNull();
				}
				expect(bookingCalendar[d].map((s) => s.start)).toEqual([7, 10, 13, 16, 19]);
			}
			expect(activeBooking).toBeUndefined();
		} finally {
			await client.close();
		}
	});

	it('tags the calling Apartment\'s Slot as "mine" and surfaces it as activeBooking', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedTimeBlocks(db);
			await insertUser(db, me.id, 'A1001');
			const tbId = await timeBlockId(db, 'laundry_room', 7, 10);
			const tomorrow = start.add({ days: 1 }).toString();
			const bookingId = await insertBooking(db, {
				userId: me.id,
				timeBlockId: tbId,
				resource: 'laundry_room',
				date: tomorrow
			});

			const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				me,
				startOfToday
			);

			const slot = bookingCalendar[tomorrow][0];
			expect(slot.status).toBe('mine');
			expect(slot.bookingId).toBe(bookingId);
			expect(slot.username).toBe('A1001');

			expect(activeBooking).toBeDefined();
			expect(activeBooking?.bookingId).toBe(bookingId);
			expect(activeBooking?.status).toBe('mine');
			expect(activeBooking?.date.toString()).toBe(tomorrow);
		} finally {
			await client.close();
		}
	});

	it('tags another Apartment\'s Slot as "other" and exposes their username to a signed-in caller', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedTimeBlocks(db);
			await insertUser(db, me.id, 'A1001');
			await insertUser(db, other.id, 'B2002');
			const tbId = await timeBlockId(db, 'laundry_room', 7, 10);
			const tomorrow = start.add({ days: 1 }).toString();
			const bookingId = await insertBooking(db, {
				userId: other.id,
				timeBlockId: tbId,
				resource: 'laundry_room',
				date: tomorrow
			});

			const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				me,
				startOfToday
			);

			const slot = bookingCalendar[tomorrow][0];
			expect(slot.status).toBe('other');
			expect(slot.bookingId).toBe(bookingId);
			expect(slot.username).toBe('B2002');
			expect(activeBooking).toBeUndefined();
		} finally {
			await client.close();
		}
	});

	it('hides usernames from anonymous callers but still tags Slots as "other"', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedTimeBlocks(db);
			await insertUser(db, other.id, 'B2002');
			const tbId = await timeBlockId(db, 'laundry_room', 7, 10);
			const tomorrow = start.add({ days: 1 }).toString();
			const bookingId = await insertBooking(db, {
				userId: other.id,
				timeBlockId: tbId,
				resource: 'laundry_room',
				date: tomorrow
			});

			const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				null,
				startOfToday
			);

			const slot = bookingCalendar[tomorrow][0];
			expect(slot.status).toBe('other');
			expect(slot.bookingId).toBe(bookingId);
			expect(slot.username).toBeNull();
			expect(activeBooking).toBeUndefined();
		} finally {
			await client.close();
		}
	});

	it('covers every day from today through today + 1 month and reflects bookings at both ends of the Window', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedTimeBlocks(db);
			await insertUser(db, me.id, 'A1001');
			await insertUser(db, other.id, 'B2002');

			const tb10_13 = await timeBlockId(db, 'laundry_room', 10, 13);
			const tb13_16 = await timeBlockId(db, 'laundry_room', 13, 16);
			const tb19_22 = await timeBlockId(db, 'laundry_room', 19, 22);

			const midStr = start.add({ days: 7 }).toString();
			const tomorrow = start.add({ days: 1 }).toString();

			const startBookingId = await insertBooking(db, {
				userId: other.id,
				timeBlockId: tb10_13,
				resource: 'laundry_room',
				date: tomorrow
			});
			const midBookingId = await insertBooking(db, {
				userId: me.id,
				timeBlockId: tb13_16,
				resource: 'laundry_room',
				date: midStr
			});
			const endBookingId = await insertBooking(db, {
				userId: other.id,
				timeBlockId: tb19_22,
				resource: 'laundry_room',
				date: endStr
			});

			const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				me,
				startOfToday
			);

			const dates = expectedDates();
			expect(Object.keys(bookingCalendar)).toHaveLength(dates.length);
			expect(bookingCalendar[startStr]).toBeDefined();
			expect(bookingCalendar[endStr]).toBeDefined();

			for (const d of dates) {
				expect(bookingCalendar[d]).toHaveLength(5);
				expect(bookingCalendar[d].map((s) => s.start)).toEqual([7, 10, 13, 16, 19]);
			}

			const tomorrowSlots = bookingCalendar[tomorrow];
			expect(tomorrowSlots[0].status).toBe('free');
			expect(tomorrowSlots[1].status).toBe('other');
			expect(tomorrowSlots[1].bookingId).toBe(startBookingId);
			expect(tomorrowSlots[1].username).toBe('B2002');

			const midSlots = bookingCalendar[midStr];
			expect(midSlots[2].status).toBe('mine');
			expect(midSlots[2].bookingId).toBe(midBookingId);

			const endSlots = bookingCalendar[endStr];
			expect(endSlots[4].status).toBe('other');
			expect(endSlots[4].bookingId).toBe(endBookingId);

			expect(activeBooking?.bookingId).toBe(midBookingId);
			expect(activeBooking?.date.toString()).toBe(midStr);
		} finally {
			await client.close();
		}
	});

	it('picks the earliest Active Slot as activeBooking when the caller has multiple Bookings', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedTimeBlocks(db);
			await insertUser(db, me.id, 'A1001');
			const tb7_10 = await timeBlockId(db, 'laundry_room', 7, 10);

			const tomorrow = start.add({ days: 1 }).toString();
			const laterStr = start.add({ days: 5 }).toString();

			const earlyId = await insertBooking(db, {
				userId: me.id,
				timeBlockId: tb7_10,
				resource: 'laundry_room',
				date: tomorrow
			});
			await insertBooking(db, {
				userId: me.id,
				timeBlockId: tb7_10,
				resource: 'outdoor_area',
				date: laterStr
			});
			// Insert a second laundry booking on a later date so the caller has
			// multiple bookings on the same resource.
			await insertBooking(db, {
				userId: me.id,
				timeBlockId: tb7_10,
				resource: 'laundry_room',
				date: laterStr
			});

			const { activeBooking } = await __getBookingCalendarSnapshot(
				db,
				'laundry_room',
				me,
				startOfToday
			);

			expect(activeBooking?.bookingId).toBe(earlyId);
			expect(activeBooking?.date.toString()).toBe(tomorrow);
		} finally {
			await client.close();
		}
	});

	describe('past-end slots on today (slot-end-grain)', () => {
		const now1330 = toZoned(
			new CalendarDateTime(start.year, start.month, start.day, 13, 30, 0),
			TIMEZONE
		);

		it('marks today\'s past-end Slots as "past" with no Booking info exposed', async () => {
			const { client, db } = await makeTestDb();
			try {
				await seedTimeBlocks(db);
				await insertUser(db, me.id, 'A1001');
				await insertUser(db, other.id, 'B2002');
				const tb10_13 = await timeBlockId(db, 'laundry_room', 10, 13);
				await insertBooking(db, {
					userId: other.id,
					timeBlockId: tb10_13,
					resource: 'laundry_room',
					date: startStr
				});

				const { bookingCalendar } = await __getBookingCalendarSnapshot(
					db,
					'laundry_room',
					me,
					now1330
				);

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
			} finally {
				await client.close();
			}
		});

		it('does not surface a Historical Booking on today as activeBooking', async () => {
			const { client, db } = await makeTestDb();
			try {
				await seedTimeBlocks(db);
				await insertUser(db, me.id, 'A1001');
				const tb10_13 = await timeBlockId(db, 'laundry_room', 10, 13);
				await insertBooking(db, {
					userId: me.id,
					timeBlockId: tb10_13,
					resource: 'laundry_room',
					date: startStr
				});

				const { bookingCalendar, activeBooking } = await __getBookingCalendarSnapshot(
					db,
					'laundry_room',
					me,
					now1330
				);

				expect(bookingCalendar[startStr][1].status).toBe('past');
				expect(bookingCalendar[startStr][1].bookingId).toBeNull();
				expect(activeBooking).toBeUndefined();
			} finally {
				await client.close();
			}
		});

		it('still surfaces a future-day Booking as activeBooking even when an earlier Historical exists today', async () => {
			const { client, db } = await makeTestDb();
			try {
				await seedTimeBlocks(db);
				await insertUser(db, me.id, 'A1001');
				const tb10_13 = await timeBlockId(db, 'laundry_room', 10, 13);
				const tb7_10 = await timeBlockId(db, 'laundry_room', 7, 10);
				const tomorrowStr = start.add({ days: 1 }).toString();

				await insertBooking(db, {
					userId: me.id,
					timeBlockId: tb10_13,
					resource: 'laundry_room',
					date: startStr
				});
				const futureId = await insertBooking(db, {
					userId: me.id,
					timeBlockId: tb7_10,
					resource: 'laundry_room',
					date: tomorrowStr
				});

				const { activeBooking } = await __getBookingCalendarSnapshot(
					db,
					'laundry_room',
					me,
					now1330
				);

				expect(activeBooking?.bookingId).toBe(futureId);
				expect(activeBooking?.date.toString()).toBe(tomorrowStr);
			} finally {
				await client.close();
			}
		});
	});
});
