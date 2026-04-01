/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const sw = globalThis.self as unknown as ServiceWorkerGlobalScope;

const CACHE_STATIC = `static-${version}`;
const CACHE_FONTS = 'fonts-v1';

const PRECACHE_ASSETS = [...build, ...files];

function shouldSkip(url: URL, request: Request): boolean {
	if (request.method !== 'GET') return true;
	if (url.pathname.startsWith('/api/auth')) return true;
	if (url.pathname.startsWith('/_app/remote/')) return true;
	if (url.pathname.endsWith('/__data.json')) return true;
	return false;
}

function isGoogleFont(url: URL): boolean {
	return (
		url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com'
	);
}

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_STATIC).then((cache) => cache.addAll(PRECACHE_ASSETS)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_STATIC && key !== CACHE_FONTS)
						.map((key) => caches.delete(key))
				)
			)
	);
});

sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	if (shouldSkip(url, event.request)) return;

	// Google Fonts: cache-first with runtime population
	if (isGoogleFont(url)) {
		event.respondWith(
			caches.open(CACHE_FONTS).then(async (cache) => {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			})
		);
		return;
	}

	// Precached assets: cache-first
	if (PRECACHE_ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((cached) => cached ?? fetch(event.request)));
		return;
	}

	// Navigation: network-first with offline fallback
	if (event.request.mode === 'navigate') {
		event.respondWith(
			fetch(event.request).catch(() =>
				caches.match('/offline.html').then((cached) => {
					if (cached) return cached;
					return new Response('Offline', {
						status: 503,
						headers: { 'Content-Type': 'text/html' }
					});
				})
			)
		);
		return;
	}
});
