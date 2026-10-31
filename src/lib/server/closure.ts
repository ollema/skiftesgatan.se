import { parseDate, today } from '@internationalized/date';
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { booking, facilityClosure, timeBlock, user } from '#lib/server/db/schema.js';
import { TIMEZONE, type Resource } from '#lib/types/bookings.js';

type Database = typeof db;

export type ClosureInput = {
	resources: Resource[];
	startDate: string;
	endDate: string;
	reason?: string;
	createdBy: string;
};

export type AffectedBooking = {
	bookingId: number;
	userId: string;
	username: string | null;
	resource: Resource;
	date: string;
	startHour: number;
	endHour: number;
};

export type ClosureDateError = 'past' | 'invalid_range';

export function validateClosureRange(
	startDate: string,
	endDate: string,
	now = today(TIMEZONE)
): ClosureDateError | null {
	const start = parseDate(startDate);
	const end = parseDate(endDate);
	if (end.compare(start) < 0) return 'invalid_range';
	if (start.compare(now) < 0) return 'past';
	return null;
}

function normalizeResources(resources: Resource[]): Resource[] {
	return [...new Set(resources)].sort();
}

/**
 * Synchronous lookup so it can run inside a better-sqlite3 transaction. SQLite
 * has no `SELECT ... FOR UPDATE`; the surrounding synchronous transaction is
 * the serialization point.
 */
export function findClosureForDate(
	database: Pick<typeof db, 'select'>,
	resource: Resource,
	date: string
) {
	const row = database
		.select({ id: facilityClosure.id, reason: facilityClosure.reason })
		.from(facilityClosure)
		.where(
			and(
				eq(facilityClosure.resource, resource),
				lte(facilityClosure.startDate, date),
				gte(facilityClosure.endDate, date)
			)
		)
		.limit(1)
		.get();
	return row ?? null;
}

export async function listUpcomingClosures(database: Database = db, now = today(TIMEZONE)) {
	return database
		.select({
			id: facilityClosure.id,
			resource: facilityClosure.resource,
			startDate: facilityClosure.startDate,
			endDate: facilityClosure.endDate,
			reason: facilityClosure.reason,
			cancelledCount: facilityClosure.cancelledCount,
			createdAt: facilityClosure.createdAt,
			createdByUsername: user.username
		})
		.from(facilityClosure)
		.leftJoin(user, eq(facilityClosure.createdBy, user.id))
		.where(gte(facilityClosure.endDate, now.toString()))
		.orderBy(asc(facilityClosure.startDate), asc(facilityClosure.resource));
}

function affectedBookingQuery(
	database: Pick<typeof db, 'select'>,
	resources: Resource[],
	startDate: string,
	endDate: string
) {
	return database
		.select({
			bookingId: booking.id,
			userId: booking.userId,
			username: user.username,
			resource: booking.resource,
			date: booking.date,
			startHour: timeBlock.startHour,
			endHour: timeBlock.endHour
		})
		.from(booking)
		.innerJoin(timeBlock, eq(booking.timeBlockId, timeBlock.id))
		.innerJoin(user, eq(booking.userId, user.id))
		.where(
			and(
				inArray(booking.resource, resources),
				gte(booking.date, startDate),
				lte(booking.date, endDate)
			)
		)
		.orderBy(asc(booking.date), asc(booking.resource), asc(timeBlock.startHour));
}

export async function previewClosure(
	database: Database,
	{ resources, startDate, endDate }: Pick<ClosureInput, 'resources' | 'startDate' | 'endDate'>
): Promise<AffectedBooking[]> {
	return affectedBookingQuery(database, normalizeResources(resources), startDate, endDate);
}

export async function createClosure(
	database: Database,
	input: ClosureInput
): Promise<{
	closures: (typeof facilityClosure.$inferSelect)[];
	cancelled: AffectedBooking[];
}> {
	const resources = normalizeResources(input.resources);
	if (resources.length === 0) throw new Error('a Closure needs at least one Facility');

	const dateError = validateClosureRange(input.startDate, input.endDate);
	if (dateError) throw new Error(`invalid Closure range: ${dateError}`);

	return database.transaction((tx) => {
		// Synchronous transactions plus a single app process replace Postgres row
		// locks: no other request can interleave between this check and the
		// deletes/inserts below.
		const cancelled = affectedBookingQuery(tx, resources, input.startDate, input.endDate).all();

		if (cancelled.length > 0) {
			tx.delete(booking)
				.where(
					inArray(
						booking.id,
						cancelled.map((b) => b.bookingId)
					)
				)
				.run();
		}

		const closures: (typeof facilityClosure.$inferSelect)[] = [];
		for (const resource of resources) {
			const [row] = tx
				.insert(facilityClosure)
				.values({
					resource,
					startDate: input.startDate,
					endDate: input.endDate,
					reason: input.reason ?? null,
					cancelledCount: cancelled.filter((b) => b.resource === resource).length,
					createdBy: input.createdBy
				})
				.returning()
				.all();
			closures.push(row);
		}

		return { closures, cancelled };
	});
}

export async function deleteClosure(
	database: Database,
	id: number
): Promise<typeof facilityClosure.$inferSelect | null> {
	const [row] = await database
		.delete(facilityClosure)
		.where(eq(facilityClosure.id, id))
		.returning();
	return row ?? null;
}
