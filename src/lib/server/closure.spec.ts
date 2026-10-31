import { describe, it, expect } from 'vitest';
import { today } from '@internationalized/date';
import { and, eq } from 'drizzle-orm';
import { TIMEZONE, type Resource } from '#lib/types/bookings.js';
import { makeTestDb, type TestDb } from './db/testing';
import { booking, bookingReminder, facilityClosure, timeBlock, user } from './db/schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import {
	createClosure,
	deleteClosure,
	listUpcomingClosures,
	previewClosure,
	validateClosureRange
} from './closure';

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
	if (rows.length === 0) throw new Error(`no time_block for ${resource} ${startHour}-${endHour}`);
	return rows[0].id;
}

async function insertBooking(
	db: TestDb,
	opts: { userId: string; timeBlockId: number; resource: Resource; date: string }
): Promise<number> {
	const [row] = await db.insert(booking).values(opts).returning({ id: booking.id });
	return row.id;
}

const admin = { id: 'apt-admin', username: 'B1001' };
const me = { id: 'apt-A1001', username: 'A1001' };
const other = { id: 'apt-B2002', username: 'B2002' };

const start = today(TIMEZONE);
const tomorrow = start.add({ days: 1 });
const tomorrowStr = tomorrow.toString();
const dayAfterStr = start.add({ days: 2 }).toString();
const outOfRangeStr = start.add({ days: 5 }).toString();

async function seedPeople(db: TestDb) {
	await seedTimeBlocks(db);
	await insertUser(db, admin.id, admin.username);
	await insertUser(db, me.id, me.username);
	await insertUser(db, other.id, other.username);
}

describe('validateClosureRange', () => {
	it('accepts today and future ranges', () => {
		expect(validateClosureRange(start.toString(), start.toString())).toBeNull();
		expect(validateClosureRange(tomorrowStr, dayAfterStr)).toBeNull();
	});

	it('rejects a range that ends before it starts', () => {
		expect(validateClosureRange(dayAfterStr, tomorrowStr)).toBe('invalid_range');
	});

	it('rejects a range that starts in the past', () => {
		expect(validateClosureRange(start.subtract({ days: 1 }).toString(), tomorrowStr)).toBe('past');
	});
});

describe('createClosure', () => {
	it('cancels only bookings for the selected Facility and date range', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			const laundry = await timeBlockId(db, 'laundry_room', 7, 10);
			const outdoor = await timeBlockId(db, 'outdoor_area', 7, 22);

			const inRange = await insertBooking(db, {
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: tomorrowStr
			});
			const otherFacility = await insertBooking(db, {
				userId: other.id,
				timeBlockId: outdoor,
				resource: 'outdoor_area',
				date: tomorrowStr
			});
			const outsideRange = await insertBooking(db, {
				userId: other.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: outOfRangeStr
			});

			const result = await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: dayAfterStr,
				reason: 'Underhåll',
				createdBy: admin.id
			});

			expect(result.cancelled.map((b) => b.bookingId)).toEqual([inRange]);
			expect(result.closures).toHaveLength(1);
			expect(result.closures[0]).toMatchObject({
				resource: 'laundry_room',
				startDate: tomorrowStr,
				endDate: dayAfterStr,
				reason: 'Underhåll',
				cancelledCount: 1
			});

			const remaining = await db.select({ id: booking.id }).from(booking).orderBy(booking.id);
			expect(remaining.map((b) => b.id)).toEqual([otherFacility, outsideRange]);
		} finally {
			client.close();
		}
	});

	it('creates one closure per selected Facility', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			const result = await createClosure(db, {
				resources: ['outdoor_area', 'laundry_room', 'outdoor_area'],
				startDate: tomorrowStr,
				endDate: tomorrowStr,
				createdBy: admin.id
			});

			expect(result.closures).toHaveLength(2);
			expect(result.closures.map((c) => c.resource).sort()).toEqual([
				'laundry_room',
				'outdoor_area'
			]);
		} finally {
			client.close();
		}
	});

	it('cascade-deletes reminders for cancelled bookings', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			const laundry = await timeBlockId(db, 'laundry_room', 10, 13);
			const bookingId = await insertBooking(db, {
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: tomorrowStr
			});
			await db.insert(bookingReminder).values({
				bookingId,
				userId: me.id,
				offsetMinutes: 1440,
				notifyAt: new Date()
			});

			await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: tomorrowStr,
				createdBy: admin.id
			});

			const reminders = await db.select().from(bookingReminder);
			expect(reminders).toHaveLength(0);
		} finally {
			client.close();
		}
	});

	it('records zero cancellations when the range is empty', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			const result = await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: tomorrowStr,
				createdBy: admin.id
			});
			expect(result.cancelled).toEqual([]);
			expect(result.closures[0].cancelledCount).toBe(0);
		} finally {
			client.close();
		}
	});
});

describe('previewClosure', () => {
	it('returns the bookings that would be cancelled without deleting them', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			const laundry = await timeBlockId(db, 'laundry_room', 10, 13);
			const bookingId = await insertBooking(db, {
				userId: me.id,
				timeBlockId: laundry,
				resource: 'laundry_room',
				date: tomorrowStr
			});

			const preview = await previewClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: tomorrowStr
			});

			expect(preview).toEqual([
				expect.objectContaining({
					bookingId,
					username: 'A1001',
					resource: 'laundry_room',
					date: tomorrowStr,
					startHour: 10,
					endHour: 13
				})
			]);
			expect(await db.select().from(booking)).toHaveLength(1);
		} finally {
			client.close();
		}
	});
});

describe('listUpcomingClosures / deleteClosure', () => {
	it('lists upcoming closures and removes one on delete', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			const { closures } = await createClosure(db, {
				resources: ['laundry_room'],
				startDate: tomorrowStr,
				endDate: dayAfterStr,
				reason: 'Fönsterbyte',
				createdBy: admin.id
			});

			const listed = await listUpcomingClosures(db);
			expect(listed).toHaveLength(1);
			expect(listed[0]).toMatchObject({
				id: closures[0].id,
				resource: 'laundry_room',
				reason: 'Fönsterbyte',
				createdByUsername: 'B1001'
			});

			const deleted = await deleteClosure(db, closures[0].id);
			expect(deleted?.id).toBe(closures[0].id);
			expect(await listUpcomingClosures(db)).toEqual([]);
		} finally {
			client.close();
		}
	});

	it('does not list closures that ended in the past', async () => {
		const { client, db } = await makeTestDb();
		try {
			await seedPeople(db);
			await db.insert(facilityClosure).values({
				resource: 'laundry_room',
				startDate: start.subtract({ days: 2 }).toString(),
				endDate: start.subtract({ days: 1 }).toString(),
				createdBy: admin.id
			});

			expect(await listUpcomingClosures(db)).toEqual([]);
		} finally {
			client.close();
		}
	});
});
