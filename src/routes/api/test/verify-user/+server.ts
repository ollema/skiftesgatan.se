import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (!env.TEST_MODE) error(404);

	const { username } = await request.json();
	await db
		.update(user)
		.set({ emailVerified: true })
		.where(eq(user.username, username.toLowerCase()));

	return json({ ok: true });
};
