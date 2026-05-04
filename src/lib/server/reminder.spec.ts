import { describe, it, expect } from 'vitest';
import { CalendarDate, CalendarDateTime, toZoned } from '@internationalized/date';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { and, eq } from 'drizzle-orm';
import { TIMEZONE, type Resource } from '$lib/types/bookings';
import * as schema from './db/schema';
import { booking, timeBlock, user } from './db/schema';
import { reminderPreference, bookingReminder } from './db/reminder.schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import { computeNotifyAt, createBookingReminders, setReminderPreference } from './reminder';
import { buildBookingReminderVariables } from './reminder.email';

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function makeTestDb(): Promise<{ client: PGlite; db: TestDb }> {
	const client = new PGlite();
	const db = drizzle(client, { schema });
	const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
	await pushed.apply();
	await seedTimeBlocks(db);
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
	const [row] = await db
		.select({ id: timeBlock.id })
		.from(timeBlock)
		.where(
			and(
				eq(timeBlock.resource, resource),
				eq(timeBlock.startHour, startHour),
				eq(timeBlock.endHour, endHour)
			)
		);
	if (!row) throw new Error(`no time_block for ${resource} ${startHour}-${endHour}`);
	return row.id;
}

describe('computeNotifyAt', () => {
	it('subtracts 60 minutes from booking start', () => {
		const result = computeNotifyAt('2026-04-15', 10, 60);
		// 2026-04-15 10:00 Stockholm (CEST, UTC+2) = 08:00 UTC → minus 60 min = 07:00 UTC
		expect(result.toISOString()).toBe('2026-04-15T07:00:00.000Z');
	});

	it('subtracts 1440 minutes (24 hours) crossing day boundary', () => {
		const result = computeNotifyAt('2026-04-15', 7, 1440);
		// 2026-04-15 07:00 Stockholm (CEST, UTC+2) = 05:00 UTC → minus 24h = 2026-04-14 05:00 UTC
		expect(result.toISOString()).toBe('2026-04-14T05:00:00.000Z');
	});

	it('handles DST spring forward (2026-03-29 in Sweden)', () => {
		// Sweden switches CET→CEST on 2026-03-29 at 02:00
		// 2026-03-29 07:00 Stockholm is CEST (UTC+2) = 05:00 UTC
		// Minus 60 min = 06:00 Stockholm = 04:00 UTC (still CEST)
		const result = computeNotifyAt('2026-03-29', 7, 60);
		expect(result.toISOString()).toBe('2026-03-29T04:00:00.000Z');
	});

	it('handles DST spring forward with 24h offset crossing the boundary', () => {
		// 2026-03-29 07:00 Stockholm (CEST, UTC+2) = 05:00 UTC
		// Minus 1440 absolute minutes = 2026-03-28 05:00 UTC = 06:00 CET
		// (24 real hours before, not wall-clock hours)
		const result = computeNotifyAt('2026-03-29', 7, 1440);
		expect(result.toISOString()).toBe('2026-03-28T05:00:00.000Z');
	});
});

describe('buildBookingReminderVariables', () => {
	const ref = new CalendarDate(2026, 4, 15);

	it('uses Swedish resource name for laundry', () => {
		const vars = buildBookingReminderVariables({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(vars.RESOURCE).toBe('Tvättstugan');
		expect(vars.RESOURCE_LOWER).toBe('tvättstugan');
	});

	it('uses Swedish resource name for outdoor area', () => {
		const vars = buildBookingReminderVariables({
			resource: 'outdoor_area',
			date: '2026-04-16',
			startHour: 7,
			endHour: 22,
			referenceDate: ref
		});
		expect(vars.RESOURCE).toBe('Uteplats');
		expect(vars.RESOURCE_LOWER).toBe('uteplats');
	});

	it('says imorgon when date is tomorrow', () => {
		const vars = buildBookingReminderVariables({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(vars.RELATIVE_DAY).toBe('imorgon');
	});

	it('says idag when date is today', () => {
		const vars = buildBookingReminderVariables({
			resource: 'laundry_room',
			date: '2026-04-15',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(vars.RELATIVE_DAY).toBe('idag');
	});

	it('uses weekday and date for dates further away', () => {
		const vars = buildBookingReminderVariables({
			resource: 'laundry_room',
			date: '2026-04-20',
			startHour: 7,
			endHour: 10,
			referenceDate: ref
		});
		// 2026-04-20 is a Monday
		expect(vars.RELATIVE_DAY).toBe('måndag 20 april');
	});

	it('formats time range with zero-padded hours and en-dash', () => {
		const vars = buildBookingReminderVariables({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 7,
			endHour: 10,
			referenceDate: ref
		});
		expect(vars.TIME_RANGE).toBe('07:00\u201310:00');
	});
});

describe('createBookingReminders', () => {
	const userId = 'apt-A1001';
	const username = 'A1001';

	it('does not insert a reminder when notifyAt is at or before now', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, userId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			// Apartment has the 60-minute reminder enabled.
			await db.insert(reminderPreference).values({
				userId,
				resource: 'laundry_room',
				offsetMinutes: 60,
				enabled: true
			});
			// Apartment books today's 10\u201313 Slot at 09:30 \u2014 only 30 min before start,
			// well inside the 60-minute reminder window. The reminder is moot.
			const dateStr = '2026-05-04';
			const [b] = await db
				.insert(booking)
				.values({ userId, timeBlockId: tbId, resource: 'laundry_room', date: dateStr })
				.returning({ id: booking.id });
			const now = toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE);

			const scheduled = await createBookingReminders(
				b.id,
				userId,
				'laundry_room',
				dateStr,
				tbId,
				now,
				db
			);

			expect(scheduled).toBe(0);
			const rows = await db
				.select()
				.from(bookingReminder)
				.where(eq(bookingReminder.userId, userId));
			expect(rows).toEqual([]);
		} finally {
			await client.close();
		}
	});

	it('does not insert a reminder when the slot has already started', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, userId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			await db.insert(reminderPreference).values({
				userId,
				resource: 'laundry_room',
				offsetMinutes: 1440,
				enabled: true
			});
			// Booking the 10\u201313 Slot at 11:30 \u2014 slot is already in progress.
			const dateStr = '2026-05-04';
			const [b] = await db
				.insert(booking)
				.values({ userId, timeBlockId: tbId, resource: 'laundry_room', date: dateStr })
				.returning({ id: booking.id });
			const now = toZoned(new CalendarDateTime(2026, 5, 4, 11, 30), TIMEZONE);

			const scheduled = await createBookingReminders(
				b.id,
				userId,
				'laundry_room',
				dateStr,
				tbId,
				now,
				db
			);

			expect(scheduled).toBe(0);
			const rows = await db.select().from(bookingReminder);
			expect(rows).toEqual([]);
		} finally {
			await client.close();
		}
	});

	it('inserts a reminder when notifyAt is strictly in the future', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, userId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 16, 19);
			await db.insert(reminderPreference).values({
				userId,
				resource: 'laundry_room',
				offsetMinutes: 60,
				enabled: true
			});
			// Booking today's 16\u201319 Slot at 09:30 \u2014 reminder fires at 15:00, well
			// in the future.
			const dateStr = '2026-05-04';
			const [b] = await db
				.insert(booking)
				.values({ userId, timeBlockId: tbId, resource: 'laundry_room', date: dateStr })
				.returning({ id: booking.id });
			const now = toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE);

			const scheduled = await createBookingReminders(
				b.id,
				userId,
				'laundry_room',
				dateStr,
				tbId,
				now,
				db
			);

			expect(scheduled).toBe(1);
			const rows = await db
				.select()
				.from(bookingReminder)
				.where(eq(bookingReminder.bookingId, b.id));
			expect(rows).toHaveLength(1);
			expect(rows[0].status).toBe('pending');
		} finally {
			await client.close();
		}
	});

	it('inserts only the offsets whose window is still open', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, userId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			// Apartment has both a 60-minute and a 1440-minute (24h) reminder enabled.
			await db.insert(reminderPreference).values([
				{ userId, resource: 'laundry_room', offsetMinutes: 60, enabled: true },
				{ userId, resource: 'laundry_room', offsetMinutes: 1440, enabled: true }
			]);
			// Booking tomorrow's 10\u201313 Slot today at 11:00. Tomorrow 10:00 minus
			// 60 min = tomorrow 09:00 \u2192 still in the future. Tomorrow 10:00 minus
			// 1440 min = today 10:00 \u2192 already in the past.
			const dateStr = '2026-05-05';
			const [b] = await db
				.insert(booking)
				.values({ userId, timeBlockId: tbId, resource: 'laundry_room', date: dateStr })
				.returning({ id: booking.id });
			const now = toZoned(new CalendarDateTime(2026, 5, 4, 11, 0), TIMEZONE);

			const scheduled = await createBookingReminders(
				b.id,
				userId,
				'laundry_room',
				dateStr,
				tbId,
				now,
				db
			);

			expect(scheduled).toBe(1);
			const rows = await db
				.select({ offsetMinutes: bookingReminder.offsetMinutes })
				.from(bookingReminder)
				.where(eq(bookingReminder.bookingId, b.id));
			expect(rows).toEqual([{ offsetMinutes: 60 }]);
		} finally {
			await client.close();
		}
	});
});

describe('setReminderPreference enabling', () => {
	const userId = 'apt-A1001';
	const username = 'A1001';

	it('does not schedule reminders for future bookings whose window has already closed', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, userId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			// Apartment already has a Booking for today's 10\u201313 Slot.
			const dateStr = '2026-05-04';
			await db
				.insert(booking)
				.values({ userId, timeBlockId: tbId, resource: 'laundry_room', date: dateStr });
			// At 09:30, apartment toggles 60-minute reminders on. Booking starts in
			// 30 min, inside the window \u2014 no reminder should be scheduled.
			const now = toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE);

			const scheduled = await setReminderPreference(userId, 'laundry_room', 60, true, now, db);

			expect(scheduled).toBe(0);
			const rows = await db.select().from(bookingReminder);
			expect(rows).toEqual([]);
		} finally {
			await client.close();
		}
	});

	it('schedules reminders for future bookings whose window is still open', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, userId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 16, 19);
			const dateStr = '2026-05-04';
			await db
				.insert(booking)
				.values({ userId, timeBlockId: tbId, resource: 'laundry_room', date: dateStr });
			const now = toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE);

			const scheduled = await setReminderPreference(userId, 'laundry_room', 60, true, now, db);

			expect(scheduled).toBe(1);
			const rows = await db.select().from(bookingReminder);
			expect(rows).toHaveLength(1);
			expect(rows[0].offsetMinutes).toBe(60);
		} finally {
			await client.close();
		}
	});
});
