import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import { auth, requireAuth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const getUser = query(() => requireAuth());

export const login = form(
	v.object({
		email: v.pipe(v.string(), v.nonEmpty()),
		_password: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ email, _password }) => {
		const { request } = getRequestEvent();
		try {
			await auth.api.signInEmail({
				body: { email, password: _password },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid(e.message || 'Invalid email or password');
			}
			throw e;
		}
		redirect(303, '/auth');
	}
);

export const signup = form(
	v.object({
		email: v.pipe(v.string(), v.nonEmpty()),
		_password: v.pipe(v.string(), v.nonEmpty()),
		name: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ email, _password, name }) => {
		const { request } = getRequestEvent();
		try {
			await auth.api.signUpEmail({
				body: { email, password: _password, name },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) {
				invalid(e.message || 'Registration failed');
			}
			throw e;
		}
		redirect(303, '/auth');
	}
);

export const signout = form(async () => {
	const { request } = getRequestEvent();
	await auth.api.signOut({ headers: request.headers });
	redirect(303, '/auth/login');
});
