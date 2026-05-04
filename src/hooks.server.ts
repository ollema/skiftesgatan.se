import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { log } from '$lib/server/log';
import { validateEnv } from '$lib/server/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });

	// Workaround for sveltejs/kit#15790: nginx buffers query.live (application/x-ndjson)
	// streams until they time out. X-Accel-Buffering: no opts the response out of buffering;
	// non-nginx proxies ignore it.
	if (response.headers.get('content-type')?.includes('application/x-ndjson')) {
		response.headers.set('X-Accel-Buffering', 'no');
	}

	const sessionUser = event.locals.user;
	const method = event.request.method;
	const isMutation = method !== 'GET' && method !== 'HEAD';
	if (sessionUser && isMutation && response.status < 400) {
		void db
			.update(user)
			.set({ lastActiveAt: new Date() })
			.where(eq(user.id, sessionUser.id))
			.catch((e) =>
				log.warn(
					`[activity] failed to update last-active timestamp for apartment ${sessionUser.username}: ${e}`
				)
			);
	}

	return response;
};

export const handle: Handle = handleBetterAuth;

export const init: ServerInit = async () => {
	if (building) return;
	if (process.env.VITEST) return;

	validateEnv();

	const { startScheduler } = await import('$lib/server/reminder.scheduler');
	startScheduler();
};

export const handleError: HandleServerError = ({ error, status, event, message }) => {
	if (process.env.LOG_LEVEL !== 'error') {
		console.error(`[${status}] ${event.request.method} ${event.url.pathname}`);
		if (error instanceof Error) console.error(error.stack);
	}
	return { message };
};
