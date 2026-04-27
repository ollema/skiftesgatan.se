import { mkdirSync, rmSync } from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { spawnPreview, waitForReady } from '../../e2e/test-server';

const SETUP_PORT = 4172;
const AUTH_DIR = 'e2e/.auth';

export async function bakeAuthForTemplate(opts: {
	databaseUrl: string;
	usernames: string[];
}): Promise<void> {
	rmSync(AUTH_DIR, { recursive: true, force: true });
	mkdirSync(AUTH_DIR, { recursive: true });

	const server = spawnPreview(SETUP_PORT, opts.databaseUrl);
	try {
		await waitForReady(server.url);
		const browser = await chromium.launch();
		try {
			// Bake in batches to keep load on the preview server (and its DB
			// connection pool) bounded. 32-wide Promise.all is enough to hang
			// 1–2 contexts past the per-page 30s timeout on a slow network.
			const BATCH_SIZE = 8;
			for (let i = 0; i < opts.usernames.length; i += BATCH_SIZE) {
				const batch = opts.usernames.slice(i, i + BATCH_SIZE);
				await Promise.all(batch.map((u) => bakeStorageState(browser, server.url, u)));
			}
		} finally {
			await browser.close();
		}
	} finally {
		server.proc.kill('SIGTERM');
	}
}

async function bakeStorageState(browser: Browser, serverUrl: string, username: string) {
	const ctx = await browser.newContext({ baseURL: serverUrl });
	try {
		const page = await ctx.newPage();
		await page.goto('/konto/logga-in');
		const loginForm = page.locator('form').nth(0);
		await loginForm.getByLabel('Lägenhet').fill(username);
		await loginForm.getByLabel('Lösenord').fill(`password-${username}`);
		await loginForm.getByRole('button', { name: 'Logga in' }).click();
		await page.waitForURL('/konto', { timeout: 30_000 });
		await ctx.storageState({ path: `${AUTH_DIR}/${username}.json` });
	} finally {
		await ctx.close();
	}
}
