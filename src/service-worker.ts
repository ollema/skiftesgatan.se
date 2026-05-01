/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const sw = globalThis.self as unknown as ServiceWorkerGlobalScope;

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

// User-scoped responses that must never be cached: caching them would leak
// session/booking/load data across users on a shared device and serve stale
// state. Non-GET is already filtered separately.
function shouldSkip(url: URL, request: Request): boolean {
	if (request.method !== 'GET') return true;
	if (url.pathname.startsWith('/api/auth')) return true;
	if (url.pathname.startsWith('/_app/remote/')) return true;
	if (url.pathname.endsWith('/__data.json')) return true;
	return false;
}

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (shouldSkip(url, event.request)) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// Precached build/static assets: cache-first
			if (ASSETS.includes(url.pathname)) {
				const hit = await cache.match(url.pathname);
				if (hit) return hit;
			}

			// Everything else: network-first, fall back to cache when offline
			try {
				const response = await fetch(event.request);
				if (
					response instanceof Response &&
					response.status === 200 &&
					!response.headers.get('cache-control')?.includes('no-store')
				) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch (err) {
				const hit = await cache.match(event.request);
				if (hit) return hit;
				throw err;
			}
		})()
	);
});
