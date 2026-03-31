import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import { PASSWORD_CONFIG, usernamePlugin } from '$lib/server/auth.config';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: 'Verifiera din e-postadress',
				html: `<p>Klicka på länken för att verifiera din e-post: <a href="${url}">${url}</a></p>`
			});
		},
		autoSignInAfterVerification: true
	},
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
		requireEmailVerification: true,
		...PASSWORD_CONFIG,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				subject: 'Återställ ditt lösenord',
				html: `<p>Klicka på länken för att återställa ditt lösenord: <a href="${url}">${url}</a></p>`
			});
		}
	},
	user: {
		changeEmail: {
			enabled: true
		}
	},
	plugins: [
		usernamePlugin(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export function requireAuth() {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(307, '/konto/login');
	return locals.user;
}

export function getAuthUser() {
	const { locals } = getRequestEvent();
	return locals.user ?? null;
}
