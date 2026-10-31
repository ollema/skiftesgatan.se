import 'dotenv/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import * as schema from '../../src/lib/server/db/schema.js';

/**
 * One-off Postgres → SQLite migration. Not part of normal development.
 *
 *   SOURCE_DATABASE_URL='postgres://…' SQLITE_PATH=/tmp/skiftesgatan.db \
 *     pnpm tsx scripts/db/migrate-pg-to-sqlite.ts
 *
 * The target file must already have the schema (`pnpm db:push`). Session and
 * verification rows are intentionally dropped: everyone logs in again.
 */

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const sqlitePath = process.env.SQLITE_PATH;

if (!sourceUrl) {
	console.error('SOURCE_DATABASE_URL is required');
	process.exit(1);
}
if (!sqlitePath) {
	console.error('SQLITE_PATH is required');
	process.exit(1);
}

function toDate(value: unknown): Date | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value;
	const parsed = new Date(String(value));
	if (Number.isNaN(parsed.getTime())) throw new Error(`invalid timestamp: ${String(value)}`);
	return parsed;
}

/** Postgres `date` columns may surface as `Date` or `YYYY-MM-DD`; both map to text. */
function toDateString(value: unknown): string {
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return String(value);
}

const client = new Database(sqlitePath);
client.pragma('foreign_keys = ON');
const db = drizzle(client, { schema });

const hasSchema = client
	.prepare("select name from sqlite_master where type = 'table' and name = 'user'")
	.get();
if (!hasSchema) {
	console.error(`No schema in ${sqlitePath}. Run "SQLITE_PATH=${sqlitePath} pnpm db:push" first.`);
	process.exit(1);
}
const existingUsers = (client.prepare('select count(*) as n from "user"').get() as { n: number }).n;
if (existingUsers > 0) {
	console.error(
		`${sqlitePath} already contains ${existingUsers} user(s); refusing to migrate twice.`
	);
	process.exit(1);
}

const source = postgres(sourceUrl, { max: 1 });

function copyTable<T extends Record<string, unknown>>(
	name: string,
	rows: T[],
	insert: (chunk: T[]) => { run: () => unknown }
): number {
	for (let i = 0; i < rows.length; i += 200) {
		// better-sqlite3 transactions are synchronous, so execute each chunk
		// explicitly rather than awaiting a query builder inside the callback.
		insert(rows.slice(i, i + 200)).run();
	}
	console.log(`  ${name}: ${rows.length}`);
	return rows.length;
}

let failed = false;

try {
	const users = await source<
		{
			id: string;
			name: string;
			email: string;
			email_verified: boolean;
			image: string | null;
			created_at: Date;
			updated_at: Date;
			username: string | null;
			display_username: string | null;
			role: string | null;
			banned: boolean | null;
			ban_reason: string | null;
			ban_expires: Date | null;
			last_active_at: Date | null;
		}[]
	>`select * from "user" order by created_at`;

	const accounts = await source<
		{
			id: string;
			account_id: string;
			provider_id: string;
			user_id: string;
			access_token: string | null;
			refresh_token: string | null;
			id_token: string | null;
			access_token_expires_at: Date | null;
			refresh_token_expires_at: Date | null;
			scope: string | null;
			password: string | null;
			created_at: Date;
			updated_at: Date;
		}[]
	>`select * from "account" order by created_at`;

	const timeBlocks = await source<
		{ id: number; start_hour: number; end_hour: number; resource: string }[]
	>`select * from time_block order by id`;

	const bookings = await source<
		{
			id: number;
			user_id: string;
			time_block_id: number;
			resource: string;
			date: string;
			created_at: Date;
		}[]
	>`select * from booking order by id`;

	const closures = await source<
		{
			id: number;
			resource: string;
			start_date: string;
			end_date: string;
			reason: string | null;
			cancelled_count: number;
			created_by: string | null;
			created_at: Date;
		}[]
	>`select * from facility_closure order by id`;

	const calendarTokens = await source<
		{ token: string; user_id: string; created_at: Date }[]
	>`select * from calendar_token order by created_at`;

	const preferences = await source<
		{
			id: number;
			user_id: string;
			resource: string;
			enabled: boolean;
			offset_minutes: number;
			created_at: Date;
			updated_at: Date;
		}[]
	>`select * from reminder_preference order by id`;

	const reminders = await source<
		{
			id: number;
			booking_id: number;
			user_id: string;
			offset_minutes: number;
			notify_at: Date;
			status: string;
			sent_at: Date | null;
			fail_reason: string | null;
			resend_id: string | null;
			created_at: Date;
		}[]
	>`select * from booking_reminder order by id`;

	console.log('Copying rows:');

	db.transaction((tx) => {
		copyTable('user', users, (chunk) =>
			tx.insert(schema.user).values(
				chunk.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					emailVerified: u.email_verified,
					image: u.image,
					createdAt: toDate(u.created_at)!,
					updatedAt: toDate(u.updated_at)!,
					username: u.username,
					displayUsername: u.display_username,
					role: u.role,
					banned: u.banned,
					banReason: u.ban_reason,
					banExpires: toDate(u.ban_expires),
					lastActiveAt: toDate(u.last_active_at)
				})) as never
			)
		);

		copyTable('account', accounts, (chunk) =>
			tx.insert(schema.account).values(
				chunk.map((a) => ({
					id: a.id,
					accountId: a.account_id,
					providerId: a.provider_id,
					userId: a.user_id,
					accessToken: a.access_token,
					refreshToken: a.refresh_token,
					idToken: a.id_token,
					accessTokenExpiresAt: toDate(a.access_token_expires_at),
					refreshTokenExpiresAt: toDate(a.refresh_token_expires_at),
					scope: a.scope,
					password: a.password,
					createdAt: toDate(a.created_at)!,
					updatedAt: toDate(a.updated_at)!
				})) as never
			)
		);

		copyTable('time_block', timeBlocks, (chunk) =>
			tx.insert(schema.timeBlock).values(
				chunk.map((t) => ({
					id: t.id,
					startHour: t.start_hour,
					endHour: t.end_hour,
					resource: t.resource
				})) as never
			)
		);

		copyTable('booking', bookings, (chunk) =>
			tx.insert(schema.booking).values(
				chunk.map((b) => ({
					id: b.id,
					userId: b.user_id,
					timeBlockId: b.time_block_id,
					resource: b.resource,
					date: toDateString(b.date),
					createdAt: toDate(b.created_at)!
				})) as never
			)
		);

		copyTable('facility_closure', closures, (chunk) =>
			tx.insert(schema.facilityClosure).values(
				chunk.map((c) => ({
					id: c.id,
					resource: c.resource,
					startDate: toDateString(c.start_date),
					endDate: toDateString(c.end_date),
					reason: c.reason,
					cancelledCount: c.cancelled_count,
					createdBy: c.created_by,
					createdAt: toDate(c.created_at)!
				})) as never
			)
		);

		copyTable('calendar_token', calendarTokens, (chunk) =>
			tx.insert(schema.calendarToken).values(
				chunk.map((t) => ({
					token: t.token,
					userId: t.user_id,
					createdAt: toDate(t.created_at)!
				})) as never
			)
		);

		copyTable('reminder_preference', preferences, (chunk) =>
			tx.insert(schema.reminderPreference).values(
				chunk.map((p) => ({
					id: p.id,
					userId: p.user_id,
					resource: p.resource,
					enabled: p.enabled,
					offsetMinutes: p.offset_minutes,
					createdAt: toDate(p.created_at)!,
					updatedAt: toDate(p.updated_at)!
				})) as never
			)
		);

		copyTable('booking_reminder', reminders, (chunk) =>
			tx.insert(schema.bookingReminder).values(
				chunk.map((r) => ({
					id: r.id,
					bookingId: r.booking_id,
					userId: r.user_id,
					offsetMinutes: r.offset_minutes,
					notifyAt: toDate(r.notify_at)!,
					status: r.status,
					sentAt: toDate(r.sent_at),
					failReason: r.fail_reason,
					resendId: r.resend_id,
					createdAt: toDate(r.created_at)!
				})) as never
			)
		);
	});

	console.log('\nVerifying:');

	const counts: [string, number, number][] = [
		['user', users.length, count('user')],
		['account', accounts.length, count('account')],
		['time_block', timeBlocks.length, count('time_block')],
		['booking', bookings.length, count('booking')],
		['facility_closure', closures.length, count('facility_closure')],
		['calendar_token', calendarTokens.length, count('calendar_token')],
		['reminder_preference', preferences.length, count('reminder_preference')],
		['booking_reminder', reminders.length, count('booking_reminder')]
	];

	for (const [name, expected, actual] of counts) {
		const ok = expected === actual;
		if (!ok) failed = true;
		console.log(`  ${ok ? '✓' : '✗'} ${name}: source=${expected} sqlite=${actual}`);
	}

	const credentialAccountsMissingPassword = client
		.prepare(
			"select count(*) as n from account where provider_id = 'credential' and (password is null or password = '')"
		)
		.get() as { n: number };
	if (credentialAccountsMissingPassword.n > 0) {
		failed = true;
		console.log(
			`  ✗ ${credentialAccountsMissingPassword.n} credential account(s) have no password hash`
		);
	} else {
		console.log('  ✓ every credential account has a password hash');
	}

	const admin = client.prepare('select role from "user" where username = \'B1001\'').get() as
		{ role: string | null } | undefined;
	if (admin?.role === 'admin') {
		console.log('  ✓ B1001 is an admin');
	} else {
		failed = true;
		console.log('  ✗ B1001 is missing or not an admin');
	}

	const fkViolations = client.pragma('foreign_key_check') as unknown[];
	if (fkViolations.length > 0) {
		failed = true;
		console.log(`  ✗ PRAGMA foreign_key_check returned ${fkViolations.length} row(s)`);
	} else {
		console.log('  ✓ PRAGMA foreign_key_check is clean');
	}
} finally {
	await source.end();
	client.close();
}

if (failed) {
	console.error('\nMigration verification failed.');
	process.exit(1);
}
console.log('\n✓ migration complete');

function count(table: string): number {
	return (client.prepare(`select count(*) as n from "${table}"`).get() as { n: number }).n;
}
