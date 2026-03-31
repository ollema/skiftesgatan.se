import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import { auth, requireAuth, getAuthUser } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const getUser = query(() => requireAuth());

export const getOptionalUser = query(() => getAuthUser());

export const login = form(
	v.object({
		username: v.pipe(
			v.string(),
			v.length(5),
			v.regex(/^[A-Da-d]1[0-3]0[12]$/, 'Must be a valid apartment (e.g. A1001)')
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
				if (e.status === 403) {
					invalid('Please verify your email address before logging in');
				} else {
					invalid(e.message || 'Invalid username or password');
				}
			}
			throw e;
		}
		redirect(303, '/auth');
	}
);

export const signup = form(
	v.object({
		username: v.pipe(
			v.string(),
			v.length(5),
			v.regex(/^[A-Da-d]1[0-3]0[12]$/, 'Must be a valid apartment (e.g. A1001)')
		),
		email: v.pipe(v.string(), v.email()),
		_password: v.pipe(v.string(), v.minLength(8))
	}),
	async ({ username, email, _password }) => {
		const { request } = getRequestEvent();
		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password: _password,
					name: username.toUpperCase(),
					username
				},
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid(e.message || 'Registration failed');
			}
			throw e;
		}
		redirect(303, '/auth/verify-email');
	}
);

export const signout = form(async () => {
	const { request } = getRequestEvent();
	await auth.api.signOut({ headers: request.headers });
	redirect(303, '/auth/login');
});

export const requestPasswordReset = form(
	v.object({
		email: v.pipe(v.string(), v.email())
	}),
	async ({ email }) => {
		try {
			await auth.api.requestPasswordReset({
				body: { email, redirectTo: '/auth/reset-password' }
			});
		} catch {
			// Always redirect to prevent email enumeration
		}
		redirect(303, '/auth/forgot-password/sent');
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
				invalid(e.message || 'Password reset failed. The link may have expired.');
			}
			throw e;
		}
		redirect(303, '/auth/login');
	}
);

export const changePassword = form(
	v.object({
		_currentPassword: v.pipe(v.string(), v.nonEmpty()),
		_newPassword: v.pipe(v.string(), v.minLength(8))
	}),
	async ({ _currentPassword, _newPassword }) => {
		const { request } = getRequestEvent();
		requireAuth();
		try {
			await auth.api.changePassword({
				body: { currentPassword: _currentPassword, newPassword: _newPassword },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid(e.message || 'Password change failed');
			}
			throw e;
		}
	}
);

export const changeEmail = form(
	v.object({
		email: v.pipe(v.string(), v.email())
	}),
	async ({ email }) => {
		const { request } = getRequestEvent();
		requireAuth();
		try {
			await auth.api.changeEmail({
				body: { newEmail: email },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid(e.message || 'Email change failed');
			}
			throw e;
		}
	}
);
