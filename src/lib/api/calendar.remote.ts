import { query, command } from '$app/server';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/auth';
import { getOrCreateToken, regenerateToken } from '$lib/server/calendar';

function buildCalendarUrl(token: string): string {
	return `${env.ORIGIN}/kalender/${token}.ics`;
}

export const getCalendarUrl = query(async () => {
	const user = requireAuth();
	const token = await getOrCreateToken(user.id);
	return buildCalendarUrl(token);
});

export const regenerateCalendarUrl = command(async () => {
	const user = requireAuth();
	const token = await regenerateToken(user.id);
	return buildCalendarUrl(token);
});
