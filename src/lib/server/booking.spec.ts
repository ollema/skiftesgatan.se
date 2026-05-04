import { describe, it, expect } from 'vitest';
import { CalendarDateTime, toZoned, today } from '@internationalized/date';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { pushSchema } from 'drizzle-kit/api';
import { TIMEZONE, TIME_BLOCKS } from '$lib/types/bookings';
import * as schema from './db/schema';
import { timeBlock } from './db/booking.schema';
import { seedTimeBlocks } from './db/seed-time-blocks';
import {
	activeBookingWhere,
	isBookingActive,
	validateBookingDate,
	__buildTimeBlockMap
} from './booking';

describe('TIME_BLOCKS drift', () => {
	it('seedTimeBlocks inserts every entry of TIME_BLOCKS as a time_block row', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			// pushSchema's type signature is restrictive about the db generic; the
			// runtime behaviour is correct, so cast through `unknown` here.
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			await seedTimeBlocks(db);

			const rows = await db.select().from(timeBlock);

			for (const [resource, blocks] of Object.entries(TIME_BLOCKS)) {
				for (const block of blocks) {
					expect(rows).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								resource,
								startHour: block.startHour,
								endHour: block.endHour
							})
						])
					);
				}
			}
		} finally {
			await client.close();
		}
	});

	it('preserves historic time_block rows that are not in the current TIME_BLOCKS (inclusion, not equality)', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			// pushSchema's type signature is restrictive about the db generic; the
			// runtime behaviour is correct, so cast through `unknown` here.
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			// Pre-insert a historic row whose (resource, startHour) is not in the current schedule.
			await db.insert(timeBlock).values({ resource: 'laundry_room', startHour: 8, endHour: 11 });

			await seedTimeBlocks(db);

			const rows = await db.select().from(timeBlock);
			expect(rows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ resource: 'laundry_room', startHour: 8, endHour: 11 })
				])
			);
		} finally {
			await client.close();
		}
	});
});

describe('time block cache', () => {
	it('builds a map from time_block id to (resource, startHour, endHour) covering the current schedule', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			await seedTimeBlocks(db);

			const map = await __buildTimeBlockMap(db);

			const rows = await db.select().from(timeBlock);
			for (const row of rows) {
				expect(map.get(row.id)).toEqual({
					resource: row.resource,
					startHour: row.startHour,
					endHour: row.endHour
				});
			}
			for (const [resource, blocks] of Object.entries(TIME_BLOCKS)) {
				for (const block of blocks) {
					const row = rows.find(
						(r) =>
							r.resource === resource &&
							r.startHour === block.startHour &&
							r.endHour === block.endHour
					);
					expect(
						row,
						`seeded row for ${resource} ${block.startHour}-${block.endHour}`
					).toBeDefined();
					expect(map.get(row!.id)).toEqual({
						resource,
						startHour: block.startHour,
						endHour: block.endHour
					});
				}
			}
		} finally {
			await client.close();
		}
	});

	it('resolves a historic time_block row whose (resource, startHour) is not in the current TIME_BLOCKS', async () => {
		const client = new PGlite();
		const db = drizzle(client, { schema });
		try {
			const pushed = await pushSchema(schema, db as unknown as Parameters<typeof pushSchema>[1]);
			await pushed.apply();

			const [historic] = await db
				.insert(timeBlock)
				.values({ resource: 'laundry_room', startHour: 8, endHour: 11 })
				.returning();

			await seedTimeBlocks(db);

			const map = await __buildTimeBlockMap(db);

			expect(map.get(historic.id)).toEqual({
				resource: 'laundry_room',
				startHour: 8,
				endHour: 11
			});
		} finally {
			await client.close();
		}
	});
});

describe('isBookingActive', () => {
	// Slot 10–13 on 2026-04-15 in Europe/Stockholm. slotEnd = 2026-04-15 13:00:00.
	const booking = { date: '2026-04-15', endHour: 13 };

	function stockholmZdt(year: number, month: number, day: number, h: number, m: number, s = 0) {
		return toZoned(new CalendarDateTime(year, month, day, h, m, s), TIMEZONE);
	}

	it('is Active at slotEnd - 1min', () => {
		const now = stockholmZdt(2026, 4, 15, 12, 59, 0);
		expect(isBookingActive(booking, now)).toBe(true);
	});

	it('is not Active at slotEnd exactly', () => {
		const now = stockholmZdt(2026, 4, 15, 13, 0, 0);
		expect(isBookingActive(booking, now)).toBe(false);
	});

	it('is not Active at slotEnd + 1min', () => {
		const now = stockholmZdt(2026, 4, 15, 13, 1, 0);
		expect(isBookingActive(booking, now)).toBe(false);
	});

	it('is Active when the Booking date is strictly in the future', () => {
		const now = stockholmZdt(2026, 4, 15, 23, 59, 59);
		expect(isBookingActive({ date: '2026-04-16', endHour: 7 }, now)).toBe(true);
	});

	it('is not Active when the Booking date is strictly in the past', () => {
		const now = stockholmZdt(2026, 4, 15, 0, 0, 0);
		expect(isBookingActive({ date: '2026-04-14', endHour: 22 }, now)).toBe(false);
	});
});

describe('activeBookingWhere', () => {
	function stockholmZdt(year: number, month: number, day: number, h: number, m: number, s = 0) {
		return toZoned(new CalendarDateTime(year, month, day, h, m, s), TIMEZONE);
	}

	// The predicate is consumed by drizzle-orm; we rely on its queryChunks
	// param values for behavioural assertions. Drizzle stores user-supplied
	// values as `Param` instances whose `value` field is the bound value.
	function paramValues(expr: ReturnType<typeof activeBookingWhere>): unknown[] {
		const out: unknown[] = [];
		function walk(node: unknown): void {
			if (node === null || typeof node !== 'object') return;
			const obj = node as Record<string, unknown>;
			if ('value' in obj && !('queryChunks' in obj) && !('table' in obj)) {
				out.push(obj.value);
				return;
			}
			if ('queryChunks' in obj && Array.isArray(obj.queryChunks)) {
				for (const c of obj.queryChunks) walk(c);
			}
		}
		walk(expr);
		return out;
	}

	it('parameterizes the predicate with today date string and current hour', () => {
		const now = stockholmZdt(2026, 4, 15, 12, 30, 0);
		const params = paramValues(activeBookingWhere(now));
		expect(params).toContain('2026-04-15');
		expect(params).toContain(12);
	});

	it('uses now.hour even at HH:00:00 boundary so endHour=HH is excluded', () => {
		const now = stockholmZdt(2026, 4, 15, 13, 0, 0);
		const params = paramValues(activeBookingWhere(now));
		expect(params).toContain(13);
	});
});

describe('validateBookingDate', () => {
	const now = today(TIMEZONE);

	it('accepts today', () => {
		expect(validateBookingDate(now)).toBeNull();
	});

	it('accepts tomorrow', () => {
		expect(validateBookingDate(now.add({ days: 1 }))).toBeNull();
	});

	it('accepts one month from now', () => {
		expect(validateBookingDate(now.add({ months: 1 }))).toBeNull();
	});

	it('returns "past" for yesterday', () => {
		expect(validateBookingDate(now.subtract({ days: 1 }))).toBe('past');
	});

	it('returns "too_far" for more than one month from now', () => {
		expect(validateBookingDate(now.add({ months: 1, days: 1 }))).toBe('too_far');
	});
});
