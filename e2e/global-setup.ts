import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { spawnPreview, waitForReady, runScript } from './test-server';
import { E2E_WORKERS } from '../playwright.config';

const TEMPLATE_PATH = '.pglite-test-template';
const SETUP_PORT = 4172;
const AUTH_DIR = 'e2e/.auth';

const APARTMENTS: string[] = [];
for (const block of ['A', 'B', 'C', 'D']) {
	for (const floor of [0, 1, 2, 3]) {
		for (const door of [1, 2]) {
			APARTMENTS.push(`${block}1${floor}0${door}`);
		}
	}
}

export default async function globalSetup() {
	// 1. Wipe template, all worker dirs, baked auth, and test email queue.
	rmSync(TEMPLATE_PATH, { recursive: true, force: true });
	for (let w = 0; w < E2E_WORKERS; w++) {
		rmSync(`.pglite-test-w${w}`, { recursive: true, force: true });
	}
	rmSync(AUTH_DIR, { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
	mkdirSync(AUTH_DIR, { recursive: true });

	// 2. Build app — `pnpm preview` requires build/.
	console.log('[e2e] building app...');
	await runScript('pnpm', ['build'], {});

	// 3. Push schema into the template PGlite.
	console.log('[e2e] pushing schema into template...');
	await runScript('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
		PGLITE_PATH: TEMPLATE_PATH
	});

	// 4. Seed apartments + users into the template.
	console.log('[e2e] seeding template...');
	await runScript('pnpx', ['tsx', 'scripts/db/seed-test.ts'], {
		PGLITE_PATH: TEMPLATE_PATH
	});

	// 5. Bake auth: spawn one preview against the template, log in each
	//    apartment in batches of 4 (PGlite is single-writer; wider batches
	//    just saturate the Playwright per-page 30s queue), write storageState
	//    JSONs to e2e/.auth/.
	console.log('[e2e] baking auth state...');
	const server = spawnPreview(SETUP_PORT, TEMPLATE_PATH);
	try {
		await waitForReady(server.url);
		const browser = await chromium.launch();
		try {
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

	// 6. Clone template to per-worker dirs.
	const workerPaths: string[] = [];
	for (let w = 0; w < E2E_WORKERS; w++) {
		const dest = `.pglite-test-w${w}`;
		cpSync(TEMPLATE_PATH, dest, { recursive: true });
		workerPaths.push(dest);
	}

	// 7. Hand worker paths to fixtures via env (Playwright spawns workers as
	//    separate processes — no shared module state).
	process.env.E2E_WORKER_URLS = JSON.stringify(workerPaths);
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
