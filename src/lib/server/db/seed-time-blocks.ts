import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { TIME_BLOCKS, type Resource } from '$lib/types/bookings';
import { timeBlock } from './booking.schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPgDatabase = PgDatabase<PgQueryResultHKT, any, any>;

// Idempotent + additive: onConflictDoNothing leaves historic rows untouched.
// See ADR-0004 for why historic time_block rows are load-bearing.
export async function seedTimeBlocks(db: AnyPgDatabase): Promise<void> {
	const rows = (
		Object.entries(TIME_BLOCKS) as [Resource, (typeof TIME_BLOCKS)[Resource]][]
	).flatMap(([resource, blocks]) =>
		blocks.map(({ startHour, endHour }) => ({ resource, startHour, endHour }))
	);
	for (const row of rows) {
		await db.insert(timeBlock).values(row).onConflictDoNothing();
	}
}
