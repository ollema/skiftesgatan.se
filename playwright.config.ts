import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command:
			'rm -rf .pglite-test .test-emails && pnpm exec drizzle-kit push --force && pnpx tsx src/lib/server/db/seed.ts && npm run build && npm run preview',
		port: 4173,
		env: {
			PGLITE_PATH: '.pglite-test',
			TEST_MODE: '1',
			RESEND_API_KEY: '',
			ORIGIN: 'http://localhost:4173'
		}
	},
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
