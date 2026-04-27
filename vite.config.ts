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

export default defineConfig({
	plugins: [
		tailwindcss(),
		!process.env.VITEST && contentCollections(),
		sveltekit(),
		suppressAdapterWarnings()
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
	optimizeDeps: {
		exclude: ['@electric-sql/pglite']
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
					include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['src/lib/server/test-setup.ts'],
					env: { LOG_LEVEL: 'error' }
				}
			}
		]
	}
});
