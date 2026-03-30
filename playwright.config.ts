import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command:
			'pnpm exec drizzle-kit push --force && pnpx tsx src/lib/server/db/seed.ts && npm run build && npm run preview',
		port: 4173,
		env: { PGLITE_PATH: '.pglite-test' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
