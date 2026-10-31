import { describe, it, expect } from 'vitest';
import { CalendarDateTime, toZoned, today } from '@internationalized/date';
import { and, eq } from 'drizzle-orm';
import { TIMEZONE, type Resource } from '#lib/types/bookings.js';
import { makeTestDb, type TestDb } from './db/testing';
import { booking, timeBlock, user } from './db/schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import { createClosure } from './closure';
import { bookSlot } from './booking';

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

const me = { id: 'apt-A1001', username: 'A1001' };
const admin = { id: 'apt-admin', username: 'B1001' };

const start = today(TIMEZONE);
const tomorrow = start.add({ days: 1 });
const tomorrowStr = tomorrow.toString();
const later = start.add({ days: 3 });
const laterStr = later.toString();

const startOfToday = toZoned(
	new CalendarDateTime(start.year, start.month, start.day, 0, 0, 0),
	TIMEZONE
);

async function setUp(db: TestDb) {
	await seedTimeBlocks(db);
	await insertUser(db, me.id, me.username);
	await insertUser(db, admin.id, admin.username);
}

describe('bookSlot with a Facility Closure', () => {
	it('returns "closed" and inserts nothing on a closed day', async () => {
		const { client, db } = await makeTestDb();
		try {
			await setUp(db);
			const laundry = await timeBlockId(db, 'laundry_room', 7, 10);
			await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: tomorrowStr,
				createdBy: admin.id
			});

			const result = await bookSlot({
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: tomorrow,
				now: startOfToday,
				database: db
			});

			expect(result).toEqual({ kind: 'closed', startHour: 7, endHour: 10 });
			expect(await db.select().from(booking)).toHaveLength(0);
		} finally {
			client.close();
		}
	});

	it('still books a Slot outside the closure', async () => {
		const { client, db } = await makeTestDb();
		try {
			await setUp(db);
			const laundry = await timeBlockId(db, 'laundry_room', 7, 10);
			await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: tomorrowStr,
				createdBy: admin.id
			});

			const result = await bookSlot({
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: later,
				now: startOfToday,
				database: db
			});

			expect(result.kind).toBe('ok');
			expect(await db.select().from(booking)).toHaveLength(1);
		} finally {
			client.close();
		}
	});

	it('keeps the original Booking when a replace targets a closed day', async () => {
		const { client, db } = await makeTestDb();
		try {
			await setUp(db);
			const laundry = await timeBlockId(db, 'laundry_room', 7, 10);
			const first = await bookSlot({
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: later,
				now: startOfToday,
				database: db
			});
			expect(first.kind).toBe('ok');
			if (first.kind !== 'ok') throw new Error('expected ok');

			await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: tomorrowStr,
				createdBy: admin.id
			});

			const result = await bookSlot({
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: tomorrow,
				replaceBookingId: first.booking.id,
				now: startOfToday,
				database: db
			});

			expect(result).toEqual({ kind: 'closed', startHour: 7, endHour: 10 });
			const remaining = await db.select({ date: booking.date }).from(booking);
			expect(remaining).toEqual([{ date: laterStr }]);
		} finally {
			client.close();
		}
	});
});
