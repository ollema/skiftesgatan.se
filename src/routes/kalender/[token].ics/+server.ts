import { error } from '@sveltejs/kit';
import { getUserIdByToken, generateCalendarFeed } from '$lib/server/calendar';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const userId = await getUserIdByToken(params.token);
	if (!userId) throw error(404, 'Not found');

	const ics = await generateCalendarFeed(userId);

	return new Response(ics, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Cache-Control': 'no-cache'
		}
	});
};
