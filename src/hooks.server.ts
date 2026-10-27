import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { eq } from 'drizzle-orm';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.js';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/auth.schema.js';
import { log } from '#lib/server/log.js';
import { validateEnv } from '#lib/server/env.js';
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
	if (response.headers.get('content-type')?.includes('text/event-stream')) {
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

	const { startScheduler } = await import('#lib/server/reminder.scheduler.js');
	startScheduler();
};

export const handleError: HandleServerError = ({ kind, error, event, issues }) => {
	if (process.env.LOG_LEVEL !== 'error') {
		const status = kind === 'unknown' ? 500 : error.status;
		console.error(`[${status}] ${event.request.method} ${event.url.pathname}`);

		if (kind === 'unknown') {
			if (error instanceof Error) console.error(error.stack);
			else console.error(error);
		} else if (kind === 'validation' && issues?.length) {
			console.error(issues);
		}
	}

	// Returning nothing keeps SvelteKit's defaults: the error body for app
	// errors, and a safe status/message for framework, validation, and
	// unknown errors (whose details must not reach the client).
};
