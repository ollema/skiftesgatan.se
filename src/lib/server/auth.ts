import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import { EMAIL_TEMPLATES } from '$lib/server/email.templates';
import { PASSWORD_CONFIG, usernamePlugin } from '$lib/server/auth.config';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	logger: env.LOG_LEVEL === 'error' ? { disabled: true } : undefined,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				templateAlias: EMAIL_TEMPLATES.verifyEmail.alias,
				variables: { URL: url }
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
				templateAlias: EMAIL_TEMPLATES.resetPassword.alias,
				variables: { URL: url }
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
