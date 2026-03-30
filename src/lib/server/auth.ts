import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	plugins: [
		username({
			minUsernameLength: 5,
			maxUsernameLength: 5,
			usernameValidator: (u) => /^[A-Da-d]\d{4}$/.test(u)
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export function requireAuth() {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(307, '/auth/login');
	return locals.user;
}
