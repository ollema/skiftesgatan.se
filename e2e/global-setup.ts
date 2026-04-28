import { mkdirSync, rmSync } from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { runScript, spawnPreview, waitForReady } from './test-server';

const TEMPLATE_PATH = '.pglite-test-template';
const SETUP_PORT = 4172;
const AUTH_DIR = '.auth';

const APARTMENTS: string[] = [];
for (const block of ['A', 'B', 'C', 'D']) {
	for (const floor of [0, 1, 2, 3]) {
		for (const door of [1, 2]) {
			APARTMENTS.push(`${block}1${floor}0${door}`);
		}
	}
}

export default async function globalSetup() {
	rmSync(TEMPLATE_PATH, { recursive: true, force: true });
	rmSync(AUTH_DIR, { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
	mkdirSync(AUTH_DIR);

	// drizzle.config.ts switches drivers on `!DATABASE_URL`. Local `.env` may
	// have DATABASE_URL set for dev — scrub it so drizzle-kit pushes into the
	// PGlite template, not into the dev Postgres.
	await runScript('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
		PGLITE_PATH: TEMPLATE_PATH,
		DATABASE_URL: ''
	});
	await runScript('pnpx', ['tsx', 'scripts/db/seed-test.ts'], { PGLITE_PATH: TEMPLATE_PATH });
	await runScript('pnpm', ['build'], {});

	const server = spawnPreview(SETUP_PORT, TEMPLATE_PATH);
	try {
		await waitForReady(server.url);

		const browser = await chromium.launch();
		try {
			// Batch the bakes: full parallelism chokes free CI runners on PGlite's
			// single-writer queue. 4 keeps the temp server responsive while still
			// being meaningfully faster than serial.
			const BATCH = 4;
			for (let i = 0; i < APARTMENTS.length; i += BATCH) {
				const batch = APARTMENTS.slice(i, i + BATCH);
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
		// Slow CI runners can take >30s under contention to drain the PGlite write queue.
		await page.waitForURL('/konto', { timeout: 60_000 });
		await ctx.storageState({ path: `${AUTH_DIR}/${username}.json` });
	} finally {
		await ctx.close();
	}
}
