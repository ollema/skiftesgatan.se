import { defineConfig } from '@playwright/test';

export const E2E_WORKERS = 4;

export default defineConfig({
	workers: E2E_WORKERS,
	retries: 1,
	globalSetup: './e2e/global-setup.ts',
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
