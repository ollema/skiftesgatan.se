import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { validateEnv } from '$lib/server/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;

export const init: ServerInit = async () => {
	if (building) return;
	if (process.env.VITEST) return;

	validateEnv();

	const { startScheduler } = await import('$lib/server/notification.scheduler');
	startScheduler();
};

export const handleError: HandleServerError = ({ error, status, event, message }) => {
	if (process.env.LOG_LEVEL !== 'error') {
		console.error(`[${status}] ${event.request.method} ${event.url.pathname}`);
		if (error instanceof Error) console.error(error.stack);
	}
	return { message };
};
