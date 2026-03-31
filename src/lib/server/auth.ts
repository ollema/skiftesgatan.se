import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			sendEmail({
				to: user.email,
				subject: 'Verify your email address',
				html: `<p>Click the link to verify your email: <a href="${url}">${url}</a></p>`
			});
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		minPasswordLength: 8,
		maxPasswordLength: 256,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			sendEmail({
				to: user.email,
				subject: 'Reset your password',
				html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`
			});
		}
	},
	user: {
		changeEmail: {
			enabled: true
		}
	},
	plugins: [
		username({
			minUsernameLength: 5,
			maxUsernameLength: 5,
			usernameNormalization: (u) => u.toUpperCase(),
			validationOrder: { username: 'post-normalization' },
			usernameValidator: (u) => /^[ABCD]1[0-3]0[12]$/.test(u)
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export function requireAuth() {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(307, '/auth/login');
	return locals.user;
}

export function getAuthUser() {
	const { locals } = getRequestEvent();
	return locals.user ?? null;
}
