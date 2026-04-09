import { query, command } from '$app/server';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/auth';
import { getExistingToken, createToken, regenerateToken, deleteToken } from '$lib/server/calendar';

function buildCalendarUrl(token: string): string {
	return `${env.ORIGIN}/kalender/${token}.ics`;
}

export const getCalendarUrl = query(async () => {
	const user = requireAuth();
	const token = await getExistingToken(user.id);
	return token ? buildCalendarUrl(token) : null;
});

export const createCalendarUrl = command(async () => {
	const user = requireAuth();
	const token = await createToken(user.id);
	return buildCalendarUrl(token);
});

export const regenerateCalendarUrl = command(async () => {
	const user = requireAuth();
	const token = await regenerateToken(user.id);
	return buildCalendarUrl(token);
});

export const deleteCalendarUrl = command(async () => {
	const user = requireAuth();
	await deleteToken(user.id);
});
