import { describe, it, expect } from 'vitest';
import {
	CalendarDate,
	CalendarDateTime,
	toZoned,
	type ZonedDateTime
} from '@internationalized/date';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { and, eq } from 'drizzle-orm';
import { TIMEZONE, type Resource } from '$lib/types/bookings';
import * as schema from './db/schema';
import { booking, timeBlock, user } from './db/schema';
import { reminderPreference, bookingReminder } from './db/reminder.schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import { createReminderSchedule } from './reminder-schedule';

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

function fixedClock(when: ZonedDateTime): () => ZonedDateTime {
	return () => when;
}

describe('reminderSchedule.extendForBooking', () => {
	const apartmentId = 'apt-A1001';
	const username = 'A1001';

	it('does not insert a reminder when notifyAt is at or before now', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			// Apartment has the 60-minute reminder enabled.
			await db.insert(reminderPreference).values({
				userId: apartmentId,
				resource: 'laundry_room',
				offsetMinutes: 60,
				enabled: true
			});
			// Apartment books today's 10–13 Slot at 09:30 — only 30 min before start,
			// well inside the 60-minute reminder window. The reminder is moot.
			const date = new CalendarDate(2026, 5, 4);
			const [b] = await db
				.insert(booking)
				.values({
					userId: apartmentId,
					timeBlockId: tbId,
					resource: 'laundry_room',
					date: date.toString()
				})
				.returning({ id: booking.id });
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE))
			});

			const { scheduled } = await schedule.extendForBooking({
				bookingId: b.id,
				apartmentId,
				facility: 'laundry_room',
				date,
				timeBlockId: tbId
			});

			expect(scheduled).toBe(0);
			const rows = await db
				.select()
				.from(bookingReminder)
				.where(eq(bookingReminder.userId, apartmentId));
			expect(rows).toEqual([]);
		} finally {
			await client.close();
		}
	});

	it('does not insert a reminder when the slot has already started', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			await db.insert(reminderPreference).values({
				userId: apartmentId,
				resource: 'laundry_room',
				offsetMinutes: 1440,
				enabled: true
			});
			// Booking the 10–13 Slot at 11:30 — slot is already in progress.
			const date = new CalendarDate(2026, 5, 4);
			const [b] = await db
				.insert(booking)
				.values({
					userId: apartmentId,
					timeBlockId: tbId,
					resource: 'laundry_room',
					date: date.toString()
				})
				.returning({ id: booking.id });
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 11, 30), TIMEZONE))
			});

			const { scheduled } = await schedule.extendForBooking({
				bookingId: b.id,
				apartmentId,
				facility: 'laundry_room',
				date,
				timeBlockId: tbId
			});

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
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 16, 19);
			await db.insert(reminderPreference).values({
				userId: apartmentId,
				resource: 'laundry_room',
				offsetMinutes: 60,
				enabled: true
			});
			// Booking today's 16–19 Slot at 09:30 — reminder fires at 15:00, well
			// in the future.
			const date = new CalendarDate(2026, 5, 4);
			const [b] = await db
				.insert(booking)
				.values({
					userId: apartmentId,
					timeBlockId: tbId,
					resource: 'laundry_room',
					date: date.toString()
				})
				.returning({ id: booking.id });
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE))
			});

			const { scheduled } = await schedule.extendForBooking({
				bookingId: b.id,
				apartmentId,
				facility: 'laundry_room',
				date,
				timeBlockId: tbId
			});

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
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			// Apartment has both a 60-minute and a 1440-minute (24h) reminder enabled.
			await db.insert(reminderPreference).values([
				{ userId: apartmentId, resource: 'laundry_room', offsetMinutes: 60, enabled: true },
				{ userId: apartmentId, resource: 'laundry_room', offsetMinutes: 1440, enabled: true }
			]);
			// Booking tomorrow's 10–13 Slot today at 11:00. Tomorrow 10:00 minus
			// 60 min = tomorrow 09:00 → still in the future. Tomorrow 10:00 minus
			// 1440 min = today 10:00 → already in the past.
			const date = new CalendarDate(2026, 5, 5);
			const [b] = await db
				.insert(booking)
				.values({
					userId: apartmentId,
					timeBlockId: tbId,
					resource: 'laundry_room',
					date: date.toString()
				})
				.returning({ id: booking.id });
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 11, 0), TIMEZONE))
			});

			const { scheduled } = await schedule.extendForBooking({
				bookingId: b.id,
				apartmentId,
				facility: 'laundry_room',
				date,
				timeBlockId: tbId
			});

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

describe('reminderSchedule.setPreference', () => {
	const apartmentId = 'apt-A1001';
	const username = 'A1001';

	it('does not schedule reminders for future bookings whose window has already closed', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 10, 13);
			// Apartment already has a Booking for today's 10–13 Slot.
			await db.insert(booking).values({
				userId: apartmentId,
				timeBlockId: tbId,
				resource: 'laundry_room',
				date: '2026-05-04'
			});
			// At 09:30, apartment toggles 60-minute reminders on. Booking starts in
			// 30 min, inside the window — no reminder should be scheduled.
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE))
			});

			const result = await schedule.setPreference(apartmentId, 'laundry_room', 60, true);

			expect(result.scheduled).toBe(0);
			expect(result.cancelled).toBe(0);
			const rows = await db.select().from(bookingReminder);
			expect(rows).toEqual([]);
		} finally {
			await client.close();
		}
	});

	it('schedules reminders for future bookings whose window is still open', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 16, 19);
			await db.insert(booking).values({
				userId: apartmentId,
				timeBlockId: tbId,
				resource: 'laundry_room',
				date: '2026-05-04'
			});
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE))
			});

			const result = await schedule.setPreference(apartmentId, 'laundry_room', 60, true);

			expect(result.scheduled).toBe(1);
			expect(result.cancelled).toBe(0);
			const rows = await db.select().from(bookingReminder);
			expect(rows).toHaveLength(1);
			expect(rows[0].offsetMinutes).toBe(60);
		} finally {
			await client.close();
		}
	});

	it('cancels pending reminders for that offset on that Facility when disabling', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 16, 19);
			// Existing Preference + Booking + pending Reminder for the 60-minute offset.
			await db.insert(reminderPreference).values({
				userId: apartmentId,
				resource: 'laundry_room',
				offsetMinutes: 60,
				enabled: true
			});
			const [b] = await db
				.insert(booking)
				.values({
					userId: apartmentId,
					timeBlockId: tbId,
					resource: 'laundry_room',
					date: '2026-05-04'
				})
				.returning({ id: booking.id });
			await db.insert(bookingReminder).values({
				bookingId: b.id,
				userId: apartmentId,
				offsetMinutes: 60,
				notifyAt: toZoned(new CalendarDateTime(2026, 5, 4, 15, 0), TIMEZONE).toDate()
			});
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 5, 4, 9, 30), TIMEZONE))
			});

			const result = await schedule.setPreference(apartmentId, 'laundry_room', 60, false);

			expect(result.scheduled).toBe(0);
			expect(result.cancelled).toBe(1);
			const rows = await db.select().from(bookingReminder);
			expect(rows).toEqual([]);
		} finally {
			await client.close();
		}
	});

	it('schedules a Reminder whose notify_at correctly straddles the spring-forward DST transition', async () => {
		const { client, db } = await makeTestDb();
		try {
			await insertUser(db, apartmentId, username);
			const tbId = await timeBlockId(db, 'laundry_room', 7, 10);
			// Booking on 2026-03-29 (spring-forward in Sweden). Slot starts 07:00
			// CEST = 05:00 UTC. Minus 1440 absolute minutes = 2026-03-28 05:00 UTC,
			// which is 06:00 CET (still pre-DST). Confirms we subtract real time,
			// not wall-clock time.
			await db.insert(booking).values({
				userId: apartmentId,
				timeBlockId: tbId,
				resource: 'laundry_room',
				date: '2026-03-29'
			});
			// Apartment toggles on the 24h reminder several weeks before the DST day.
			const schedule = createReminderSchedule({
				db,
				clock: fixedClock(toZoned(new CalendarDateTime(2026, 3, 1, 12, 0), TIMEZONE))
			});

			const result = await schedule.setPreference(apartmentId, 'laundry_room', 1440, true);

			expect(result.scheduled).toBe(1);
			const [reminder] = await db
				.select({ notifyAt: bookingReminder.notifyAt })
				.from(bookingReminder)
				.where(eq(bookingReminder.userId, apartmentId));
			expect(reminder.notifyAt.toISOString()).toBe('2026-03-28T05:00:00.000Z');
		} finally {
			await client.close();
		}
	});
});
