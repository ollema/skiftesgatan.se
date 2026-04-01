import { defineConfig } from '@playwright/test';

export default defineConfig({
	workers: 1,
	webServer: {
		command: 'pnpm db:reset test && pnpm db:seed test && pnpm build && pnpm preview',
		port: 4173,
		env: {
			PGLITE_PATH: '.pglite-test',
			RESEND_API_KEY: '',
			ORIGIN: 'http://localhost:4173',
			LOG_LEVEL: 'error'
		}
	},
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
