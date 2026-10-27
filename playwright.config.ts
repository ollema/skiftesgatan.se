import { defineConfig } from '@playwright/test';

export default defineConfig({
	workers: 4,
	retries: 1,
	tsconfig: './e2e/tsconfig.json',
	globalSetup: './e2e/global-setup.ts',
	globalTeardown: './e2e/global-teardown.ts',
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
