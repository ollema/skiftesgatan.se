import { defineConfig } from '@playwright/test';

export default defineConfig({
	workers: 4,
	retries: 1,
	globalSetup: './e2e/global-setup.ts',
	globalTeardown: './e2e/global-teardown.ts',
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
