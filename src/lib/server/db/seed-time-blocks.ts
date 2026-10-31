import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { TIME_BLOCKS, type Resource } from '#lib/types/bookings.js';
import { timeBlock } from './booking.schema';

// Idempotent + additive: onConflictDoNothing leaves historic rows untouched,
// which is required because existing Bookings reference them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedTimeBlocks(db: BetterSQLite3Database<any>): Promise<void> {
	const rows = (
		Object.entries(TIME_BLOCKS) as [Resource, (typeof TIME_BLOCKS)[Resource]][]
	).flatMap(([resource, blocks]) =>
		blocks.map(({ startHour, endHour }) => ({ resource, startHour, endHour }))
	);
	for (const row of rows) {
		await db.insert(timeBlock).values(row).onConflictDoNothing();
	}
}
