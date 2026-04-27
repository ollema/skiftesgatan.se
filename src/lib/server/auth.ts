import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import { EMAIL_TEMPLATES } from '$lib/server/email.templates';
import { PASSWORD_CONFIG, usernamePlugin } from '$lib/server/auth.config';
import { touchUserActivity } from '$lib/server/activity';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	logger: env.LOG_LEVEL === 'error' ? { disabled: true } : undefined,
	database: drizzleAdapter(db, { provider: 'pg' }),
	// Better Auth's rate limiter only covers client-initiated requests to
	// /api/auth/* (e.g. email verification link clicks, direct API hits).
	// It does NOT apply to auth.api.* calls from our remote functions —
	// those are protected separately by checkRateLimit() in $lib/server/rate-limit.
	rateLimit: {
		enabled: true
	},
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
		},
		customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
			...coreFields,
			role: 'user',
			banned: false,
			banReason: null,
			banExpires: null,
			...additionalFields,
			id
		})
	},
	user: {
		changeEmail: {
			enabled: true
		},
		additionalFields: {
			lastActiveAt: {
				type: 'date',
				required: false,
				input: false
			}
		}
	},
	databaseHooks: {
		session: {
			create: {
				after: async (session) => {
					await touchUserActivity(session.userId);
				}
			}
		},
		user: {
			update: {
				after: async (updatedUser, ctx) => {
					if (ctx?.context.session?.user.id === updatedUser.id) {
						await touchUserActivity(updatedUser.id);
					}
				}
			}
		}
	},
	plugins: [
		usernamePlugin(),
		admin(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export function requireAuth() {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(307, '/konto/logga-in');
	return locals.user;
}

export function requireAdmin() {
	const user = requireAuth();
	if (user.role !== 'admin') redirect(307, '/konto');
	return user;
}

export function getAuthUser() {
	const { locals } = getRequestEvent();
	return locals.user ?? null;
}
