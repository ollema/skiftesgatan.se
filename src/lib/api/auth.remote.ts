import * as v from 'valibot';
import { invalid, redirect } from '@sveltejs/kit';
import { getRequestEvent, query, form } from '$app/server';
import { auth, requireAuth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const getUser = query(() => requireAuth());

export const login = form(
	v.object({
		username: v.pipe(v.string(), v.nonEmpty()),
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
				invalid(e.message || 'Invalid username or password');
			}
			throw e;
		}
		redirect(303, '/auth');
	}
);

export const signup = form(
	v.object({
		username: v.pipe(v.string(), v.nonEmpty()),
		_password: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ username, _password }) => {
		const { request } = getRequestEvent();
		try {
			await auth.api.signUpEmail({
				body: {
					email: `${username}@skiftesgatan.local`,
					password: _password,
					name: username,
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
		redirect(303, '/auth');
	}
);

export const signout = form(async () => {
	const { request } = getRequestEvent();
	await auth.api.signOut({ headers: request.headers });
	redirect(303, '/auth/login');
});
