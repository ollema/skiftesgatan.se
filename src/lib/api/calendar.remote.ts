import { query, command } from '$app/server';
import { ORIGIN } from '$app/env/private';
import { requireAuth } from '#lib/server/auth.js';
import { log } from '#lib/server/log.js';
import {
	getExistingToken,
	createToken,
	regenerateToken,
	deleteToken
} from '#lib/server/calendar.js';
import { getSetupHints } from '#lib/api/hints.remote.js';

function buildCalendarUrl(token: string): string {
	return `${ORIGIN}/kalender/${token}.ics`;
}

export const getCalendarUrl = query(async () => {
	const user = requireAuth();
	const token = await getExistingToken(user.id);
	return token ? buildCalendarUrl(token) : null;
});

export const createCalendarUrl = command(async () => {
	const user = requireAuth();
	const token = await createToken(user.id);
	log.info(`[calendar] apartment ${user.username} created their calendar subscription`);
	await getSetupHints().refresh();
	return buildCalendarUrl(token);
});

export const regenerateCalendarUrl = command(async () => {
	const user = requireAuth();
	const token = await regenerateToken(user.id);
	log.info(`[calendar] apartment ${user.username} regenerated their calendar subscription URL`);
	await getSetupHints().refresh();
	return buildCalendarUrl(token);
});

export const deleteCalendarUrl = command(async () => {
	const user = requireAuth();
	await deleteToken(user.id);
	log.info(`[calendar] apartment ${user.username} removed their calendar subscription`);
	await getSetupHints().refresh();
});
