import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { requireAdmin } from '#lib/server/auth.js';
import { db } from '#lib/server/db/index.js';
import { RESOURCES, type Resource } from '#lib/types/bookings.js';
import {
	createClosure as createClosureDb,
	deleteClosure as deleteClosureDb,
	listUpcomingClosures,
	previewClosure as previewClosureDb,
	validateClosureRange
} from '#lib/server/closure.js';
import { bookingEvents } from '#lib/server/booking-events.js';
import { log } from '#lib/server/log.js';
import { slotPhrase } from '#lib/server/log.prose.js';

const isoDateSchema = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Ange ett giltigt datum'));

const closureInputSchema = v.object({
	resources: v.pipe(v.array(v.picklist(RESOURCES)), v.minLength(1, 'Välj minst en lokal')),
	startDate: isoDateSchema,
	endDate: isoDateSchema,
	reason: v.optional(v.pipe(v.string(), v.maxLength(200, 'Orsaken får vara högst 200 tecken')))
});

const DATE_ERROR_MESSAGES = {
	past: 'Du kan inte stänga dagar som har varit',
	invalid_range: 'Slutdatum måste vara samma dag eller senare än startdatum'
} as const;

function assertValidRange(startDate: string, endDate: string) {
	const dateError = validateClosureRange(startDate, endDate);
	if (dateError) error(400, DATE_ERROR_MESSAGES[dateError]);
}

export const listClosures = query(async () => {
	requireAdmin();
	return listUpcomingClosures();
});

export const previewClosure = query(closureInputSchema, async (input) => {
	requireAdmin();
	assertValidRange(input.startDate, input.endDate);
	return previewClosureDb(db, input);
});

export const createClosure = command(closureInputSchema, async (input) => {
	const admin = requireAdmin();
	assertValidRange(input.startDate, input.endDate);

	const result = await createClosureDb(db, {
		...input,
		reason: input.reason?.trim() || undefined,
		createdBy: admin.id
	});

	const resources = new Set<Resource>(result.closures.map((c) => c.resource));
	for (const resource of resources) bookingEvents.emit(resource);

	const facilities = [...resources].join(', ');
	const reason = input.reason?.trim();
	log.info(
		`[admin] apartment ${admin.username} closed ${facilities} from ${input.startDate} to ${input.endDate}${reason ? ` (${reason})` : ''} — cancelled ${result.cancelled.length} booking(s)`
	);
	for (const cancelled of result.cancelled) {
		log.info(
			`[booking] apartment ${cancelled.username ?? '<unknown>'}'s booking of ${slotPhrase(cancelled.resource, cancelled.date, cancelled.startHour, cancelled.endHour)} was cancelled by an admin closure`
		);
	}

	return {
		cancelledCount: result.cancelled.length,
		resources: [...resources]
	};
});

export const deleteClosure = command(v.object({ id: v.number() }), async ({ id }) => {
	const admin = requireAdmin();
	const row = await deleteClosureDb(db, id);
	if (!row) error(404, 'Stängningen hittades inte');

	bookingEvents.emit(row.resource);
	log.info(
		`[admin] apartment ${admin.username} reopened ${row.resource} from ${row.startDate} to ${row.endDate}`
	);
	return { resource: row.resource };
});
