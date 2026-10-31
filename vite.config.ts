import adapter from '@sveltejs/adapter-node';
import { relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import contentCollections from '@content-collections/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

/** Suppress known third-party warnings from adapter-node's rollup step */
function suppressAdapterWarnings(): Plugin {
	const SUPPRESSED = [
		'@__NO_SIDE_EFFECTS__',
		'@react-email/render',
		'Circular dependency:',
		'Use of eval'
	];
	return {
		name: 'suppress-adapter-warnings',
		apply: 'build',
		enforce: 'post',
		closeBundle: {
			order: 'pre',
			handler() {
				const origWrite = process.stderr.write.bind(process.stderr);
				process.stderr.write = (
					chunk: string | Uint8Array,
					encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
					cb?: (err?: Error | null) => void
				): boolean => {
					if (SUPPRESSED.some((s) => String(chunk).includes(s))) return true;
					return origWrite(chunk, encodingOrCb as BufferEncoding, cb);
				};
			}
		}
	};
}

/**
 * Vite preview compresses text responses, which buffers the incremental events
 * of `text/event-stream` responses. Opt SSE requests out of compression so live
 * query updates reach the browser (production is handled by X-Accel-Buffering).
 */
function disablePreviewSseCompression(): Plugin {
	return {
		name: 'disable-preview-sse-compression',
		configurePreviewServer(server) {
			return () => {
				const stack = (server.middlewares as unknown as { stack: unknown[] }).stack;
				stack.unshift({
					route: '',
					handle(
						req: { headers: Record<string, string | string[] | undefined> },
						_res: unknown,
						next: () => void
					) {
						if (String(req.headers.accept ?? '').includes('text/event-stream')) {
							delete req.headers['accept-encoding'];
						}
						next();
					}
				});
			};
		}
	};
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		!process.env.VITEST && contentCollections(),
		sveltekit({
			compilerOptions: {
				// defaults to rune mode for the project, execept for `node_modules`. Can be removed in svelte 6.
				runes: ({ filename }) => {
					const relativePath = relative(import.meta.dirname, filename);
					const pathSegments = relativePath.toLowerCase().split(sep);
					const isExternalLibrary = pathSegments.includes('node_modules');

					return isExternalLibrary ? undefined : true;
				},
				experimental: { async: true }
			},
			adapter: adapter(),
			experimental: { remoteFunctions: true }
		}),
		suppressAdapterWarnings(),
		disablePreviewSseCompression()
	],
	server: {
		fs: {
			allow: ['.content-collections']
		}
	},
	build: {
		rolldownOptions: {
			checks: {
				pluginTimings: false
			}
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['src/lib/server/test-setup.ts'],
					env: { LOG_LEVEL: 'error' }
				}
			}
		]
	}
});
