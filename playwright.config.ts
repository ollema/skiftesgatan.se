import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npx drizzle-kit push --force && npm run build && npm run preview',
		port: 4173,
		env: { PGLITE_PATH: '.pglite-test' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
