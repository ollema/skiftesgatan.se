import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import { auth, requireAuth, getAuthUser } from '$lib/server/auth';
import { APARTMENT_REGEX } from '$lib/server/auth.config';
import { APIError } from 'better-auth/api';
import { log } from '$lib/server/log';

export const getUser = query(() => requireAuth());

export const getOptionalUser = query(() => getAuthUser());

export const login = form(
	v.object({
		username: v.pipe(
			v.string(),
			v.length(5),
			v.regex(APARTMENT_REGEX, 'Måste vara en giltig lägenhet (t.ex. A1001)')
		),
		_password: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ username, _password }) => {
		const { request } = getRequestEvent();
		try {
			await auth.api.signInUsername({
				body: { username, password: _password },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				const reason = e.status === 403 ? 'email_not_verified' : 'invalid_credentials';
				log.warn(`[auth] login failed username=${username} reason=${reason}`);
				if (e.status === 403) {
					invalid('Verifiera din e-postadress innan du loggar in');
				} else {
					invalid('Felaktigt användarnamn eller lösenord');
				}
			}
			throw e;
		}
		log.info(`[auth] login username=${username}`);
		redirect(303, '/konto');
	}
);

export const signout = form(async () => {
	const { request, locals } = getRequestEvent();
	log.info(`[auth] signout userId=${locals.user?.id}`);
	await auth.api.signOut({ headers: request.headers });
	redirect(303, '/konto/login');
});

export const requestPasswordReset = form(
	v.object({
		email: v.pipe(v.string(), v.email())
	}),
	async ({ email }) => {
		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: '/konto/reset-password' }
			});
		} catch {
			// Always redirect to prevent email enumeration
		}
		redirect(303, '/konto/forgot-password/sent');
	}
);

export const resetPassword = form(
	v.object({
		_newPassword: v.pipe(v.string(), v.minLength(8)),
		token: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ _newPassword, token }) => {
		try {
			await auth.api.resetPassword({
				body: { newPassword: _newPassword, token }
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid('Kunde inte återställa lösenordet. Länken kan ha gått ut.');
			}
			throw e;
		}
		log.info('[auth] password reset completed');
		redirect(303, '/konto/login');
	}
);

export const changePassword = form(
	v.object({
		_currentPassword: v.pipe(v.string(), v.nonEmpty()),
		_newPassword: v.pipe(v.string(), v.minLength(8))
	}),
	async ({ _currentPassword, _newPassword }) => {
		const { request } = getRequestEvent();
		const user = requireAuth();
		try {
			await auth.api.changePassword({
				body: { currentPassword: _currentPassword, newPassword: _newPassword },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid('Kunde inte byta lösenord');
			}
			throw e;
		}
		log.info(`[auth] password changed userId=${user.id}`);
	}
);

export const changeEmail = form(
	v.object({
		email: v.pipe(v.string(), v.email())
	}),
	async ({ email }) => {
		const { request } = getRequestEvent();
		const user = requireAuth();
		try {
			await auth.api.changeEmail({
				body: { newEmail: email },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid('Kunde inte byta e-post');
			}
			throw e;
		}
		log.info(`[auth] email change requested userId=${user.id}`);
	}
);
