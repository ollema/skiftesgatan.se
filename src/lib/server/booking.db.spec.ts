import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { today, getLocalTimeZone } from '@internationalized/date';

let pgliteClient: PGlite;

vi.mock('$lib/server/db', async () => {
	const { PGlite } = await import('@electric-sql/pglite');
	const { drizzle } = await import('drizzle-orm/pglite');
	const schema = await import('$lib/server/db/schema');
	const client = new PGlite();
	pgliteClient = client;
	const db = drizzle({ client, schema });

	await client.exec(`
		CREATE TYPE resource AS ENUM ('laundry_room', 'outdoor_area');

		CREATE TABLE "user" (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			email_verified BOOLEAN NOT NULL DEFAULT FALSE,
			image TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
			username TEXT UNIQUE,
			display_username TEXT
		);

		CREATE TABLE timeslot (
			id SERIAL PRIMARY KEY,
			start_hour INTEGER NOT NULL,
			end_hour INTEGER NOT NULL,
			resource resource NOT NULL,
			UNIQUE(start_hour, end_hour, resource)
		);

		CREATE TABLE booking (
			id SERIAL PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
			timeslot_id INTEGER NOT NULL REFERENCES timeslot(id),
			resource resource NOT NULL,
			date DATE NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(resource, timeslot_id, date)
		);

		INSERT INTO "user" (id, name, email, username) VALUES
			('user1', 'A1001', 'user1@test.com', 'A1001'),
			('user2', 'B1001', 'user2@test.com', 'B1001');

		INSERT INTO timeslot (start_hour, end_hour, resource) VALUES
			(7, 10, 'laundry_room'), (10, 13, 'laundry_room'), (13, 16, 'laundry_room'),
			(16, 19, 'laundry_room'), (19, 22, 'laundry_room'), (7, 22, 'outdoor_area');
	`);

	return { db };
});

const {
	getAvailableSlots,
	getUpcomingBookings,
	hasExistingFutureBooking,
	createBooking,
	cancelBooking
} = await import('./booking');
const { db } = await import('$lib/server/db');

const now = today(getLocalTimeZone());
const tomorrow = now.add({ days: 1 });
const yesterday = now.subtract({ days: 1 });

afterAll(async () => {
	await pgliteClient?.close();
});

beforeEach(async () => {
	await db.execute(sql`DELETE FROM booking`);
});

describe('getAvailableSlots', () => {
	it('returns all laundry slots with null bookingId when no bookings', async () => {
		const slots = await getAvailableSlots(tomorrow, 'laundry_room');
		expect(slots).toHaveLength(5);
		expect(slots.every((s) => s.bookingId === null)).toBe(true);
	});

	it('returns booking info for a booked slot', async () => {
		await createBooking('user1', 1, 'laundry_room', tomorrow);
		const slots = await getAvailableSlots(tomorrow, 'laundry_room');
		const booked = slots.find((s) => s.id === 1);
		expect(booked?.bookingId).not.toBeNull();
		expect(booked?.userId).toBe('user1');
		expect(booked?.username).toBe('A1001');
		expect(slots.filter((s) => s.bookingId === null)).toHaveLength(4);
	});

	it('returns null username for unbooked slots', async () => {
		const slots = await getAvailableSlots(tomorrow, 'laundry_room');
		expect(slots.every((s) => s.username === null)).toBe(true);
	});

	it('returns 1 slot for outdoor area', async () => {
		const slots = await getAvailableSlots(tomorrow, 'outdoor_area');
		expect(slots).toHaveLength(1);
		expect(slots[0].startHour).toBe(7);
		expect(slots[0].endHour).toBe(22);
	});
});

describe('getUpcomingBookings', () => {
	it('returns empty array when no bookings exist', async () => {
		const result = await getUpcomingBookings('laundry_room');
		expect(result).toHaveLength(0);
	});

	it('returns bookings with correct username for upcoming dates', async () => {
		await createBooking('user1', 1, 'laundry_room', tomorrow);
		const result = await getUpcomingBookings('laundry_room');
		expect(result).toHaveLength(1);
		expect(result[0].timeslotId).toBe(1);
		expect(result[0].userId).toBe('user1');
		expect(result[0].username).toBe('A1001');
		expect(result[0].date).toBe(tomorrow.toString());
	});

	it('does not return bookings for other resources', async () => {
		await createBooking('user1', 6, 'outdoor_area', tomorrow);
		const result = await getUpcomingBookings('laundry_room');
		expect(result).toHaveLength(0);
	});
});

describe('hasExistingFutureBooking', () => {
	it('returns false when no bookings exist', async () => {
		expect(await hasExistingFutureBooking('user1', 'laundry_room')).toBe(false);
	});

	it('returns true when a future booking exists for the same resource', async () => {
		await createBooking('user1', 1, 'laundry_room', tomorrow);
		expect(await hasExistingFutureBooking('user1', 'laundry_room')).toBe(true);
	});

	it('returns false when only past bookings exist', async () => {
		await db.execute(
			sql`INSERT INTO booking (user_id, timeslot_id, resource, date) VALUES ('user1', 1, 'laundry_room', ${yesterday.toString()})`
		);
		expect(await hasExistingFutureBooking('user1', 'laundry_room')).toBe(false);
	});

	it('returns false for a different resource', async () => {
		await createBooking('user1', 6, 'outdoor_area', tomorrow);
		expect(await hasExistingFutureBooking('user1', 'laundry_room')).toBe(false);
	});
});

describe('cancelBooking', () => {
	it('returns true and deletes booking with correct userId', async () => {
		const [created] = await createBooking('user1', 1, 'laundry_room', tomorrow);
		expect(await cancelBooking(created.id, 'user1')).toBe(true);
		const slots = await getAvailableSlots(tomorrow, 'laundry_room');
		expect(slots.find((s) => s.id === 1)?.bookingId).toBeNull();
	});

	it('returns false with wrong userId', async () => {
		const [created] = await createBooking('user1', 1, 'laundry_room', tomorrow);
		expect(await cancelBooking(created.id, 'user2')).toBe(false);
	});

	it('returns false for a past booking', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result: any = await db.execute(
			sql`INSERT INTO booking (user_id, timeslot_id, resource, date) VALUES ('user1', 1, 'laundry_room', ${yesterday.toString()}) RETURNING id`
		);
		const bookingId = (result.rows ?? result)[0].id as number;
		expect(await cancelBooking(bookingId, 'user1')).toBe(false);
	});
});
