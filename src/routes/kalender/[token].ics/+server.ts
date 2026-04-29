import { error } from '@sveltejs/kit';
import { now } from '@internationalized/date';
import { getUserIdByToken, generateCalendarFeed } from '$lib/server/calendar';
import { TIMEZONE } from '$lib/types/bookings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const userId = await getUserIdByToken(params.token);
	if (!userId) throw error(404, 'Not found');

	const ics = await generateCalendarFeed(userId, now(TIMEZONE));

	return new Response(ics, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Cache-Control': 'no-cache'
		}
	});
};
