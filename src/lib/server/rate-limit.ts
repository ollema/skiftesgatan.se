import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { log } from '$lib/server/log';

type Bucket = { count: number; resetAt: number };

// Fixed-window in-memory rate limiter, keyed by (name, IP). Single-process is
// fine for our single-VPS deployment; if we ever scale horizontally this
// would need to move to Redis or a DB-backed store.
const buckets = new Map<string, Bucket>();

// Lazy GC: prune expired entries when the map grows past this threshold.
const GC_THRESHOLD = 200;

/**
 * Returns null when the request is allowed, or seconds-until-retry when
 * the (name, IP) bucket is exhausted. Caller decides how to surface it
 * (`invalid()` for forms, `error(429, ...)` for queries/commands).
 */
export function checkRateLimit(name: string, max: number, windowSeconds: number): number | null {
	// E2E tests run all requests from 127.0.0.1, which would exhaust per-IP
	// buckets quickly and produce flaky failures. Bypassed via env in
	// playwright.config.ts; never set in production.
	if (env.RATE_LIMIT_DISABLED === '1') return null;

	const event = getRequestEvent();
	const ip = event.getClientAddress();
	const key = `${name}:${ip}`;
	const now = Date.now();
	const windowMs = windowSeconds * 1000;

	if (buckets.size > GC_THRESHOLD) {
		for (const [k, b] of buckets) {
			if (b.resetAt < now) buckets.delete(k);
		}
	}

	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt < now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return null;
	}

	if (bucket.count >= max) {
		const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
		log.warn(`[rate-limit] ${name} exceeded for IP ${ip}, retry after ${retryAfter}s`);
		return retryAfter;
	}

	bucket.count++;
	return null;
}
