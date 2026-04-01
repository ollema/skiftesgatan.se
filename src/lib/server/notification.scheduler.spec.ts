import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';

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
		CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');

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

		CREATE TABLE booking_notification (
			id SERIAL PRIMARY KEY,
			booking_id INTEGER NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
			user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
			offset_minutes INTEGER NOT NULL,
			notify_at TIMESTAMP NOT NULL,
			status notification_status NOT NULL DEFAULT 'pending',
			sent_at TIMESTAMP,
			fail_reason TEXT,
			resend_id TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT NOW(),
			UNIQUE(booking_id, offset_minutes)
		);

		INSERT INTO "user" (id, name, email, username) VALUES
			('user1', 'Anna Lindqvist', 'anna@test.com', 'A1001');

		INSERT INTO timeslot (start_hour, end_hour, resource) VALUES
			(7, 10, 'laundry_room'), (10, 13, 'laundry_room'), (7, 22, 'outdoor_area');

		INSERT INTO booking (id, user_id, timeslot_id, resource, date) VALUES
			(1, 'user1', 1, 'laundry_room', '2026-04-15');
	`);

	return { db };
});

const mockSendEmail = vi.fn().mockResolvedValue('mock-resend-id');

vi.mock('$lib/server/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}));

const { processNotifications } = await import('./notification.scheduler');
const { db } = await import('$lib/server/db');

afterAll(async () => {
	await pgliteClient?.close();
});

beforeEach(async () => {
	await db.execute(sql`DELETE FROM booking_notification`);
	mockSendEmail.mockClear();
	mockSendEmail.mockResolvedValue('mock-resend-id');
});

describe('processNotifications', () => {
	it('sends email for due pending notification', async () => {
		const pastTime = new Date(Date.now() - 60_000);
		await db.execute(
			sql`INSERT INTO booking_notification (booking_id, user_id, offset_minutes, notify_at)
				VALUES (1, 'user1', 1440, ${pastTime})`
		);

		const count = await processNotifications();

		expect(count).toBe(1);
		expect(mockSendEmail).toHaveBeenCalledOnce();
		expect(mockSendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'anna@test.com',
				subject: expect.stringContaining('Påminnelse')
			})
		);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result: any = await db.execute(
			sql`SELECT status, resend_id, sent_at FROM booking_notification WHERE booking_id = 1`
		);
		const row = (result.rows ?? result)[0];
		expect(row.status).toBe('sent');
		expect(row.resend_id).toBe('mock-resend-id');
		expect(row.sent_at).not.toBeNull();
	});

	it('does not process future notifications', async () => {
		const futureTime = new Date(Date.now() + 3_600_000);
		await db.execute(
			sql`INSERT INTO booking_notification (booking_id, user_id, offset_minutes, notify_at)
				VALUES (1, 'user1', 60, ${futureTime})`
		);

		const count = await processNotifications();

		expect(count).toBe(0);
		expect(mockSendEmail).not.toHaveBeenCalled();
	});

	it('marks notification as failed when sendEmail throws', async () => {
		mockSendEmail.mockRejectedValueOnce(new Error('API error'));
		const pastTime = new Date(Date.now() - 60_000);
		await db.execute(
			sql`INSERT INTO booking_notification (booking_id, user_id, offset_minutes, notify_at)
				VALUES (1, 'user1', 1440, ${pastTime})`
		);

		const count = await processNotifications();

		expect(count).toBe(1);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result: any = await db.execute(
			sql`SELECT status, fail_reason FROM booking_notification WHERE booking_id = 1`
		);
		const row = (result.rows ?? result)[0];
		expect(row.status).toBe('failed');
		expect(row.fail_reason).toBe('API error');
	});

	it('returns 0 when no notifications are due', async () => {
		const count = await processNotifications();

		expect(count).toBe(0);
		expect(mockSendEmail).not.toHaveBeenCalled();
	});
});
