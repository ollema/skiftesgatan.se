import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { uniqueUser, adminUser } from './helpers';
import { spawnPreview, waitForReady } from './test-server';

type TestUser = { username: string; password: string; email: string };
type WorkerServer = { url: string; port: number };
type AsUser = (prefix: string) => Promise<{ user: TestUser; page: Page }>;
type AsAdmin = () => Promise<{ user: TestUser; page: Page }>;

type PatchedPage = Page & { __hydrationAware?: true };

function patchHydrationAware(page: Page) {
	if ((page as PatchedPage).__hydrationAware) return;
	(page as PatchedPage).__hydrationAware = true;
	const origGoto = page.goto.bind(page);
	page.goto = (async (url, opts) => {
		const res = await origGoto(url, opts);
		await page.waitForLoadState('networkidle', { timeout: 10_000 });
		return res;
	}) as typeof page.goto;

	const origReload = page.reload.bind(page);
	page.reload = (async (opts) => {
		const res = await origReload(opts);
		await page.waitForLoadState('networkidle', { timeout: 10_000 });
		return res;
	}) as typeof page.reload;

	// `networkidle` resolves immediately when called between a click and the
	// microtask that initiates the click's fetch — leaving the request to be
	// cancelled when the test moves on. Yield a tick first so any pending
	// microtask-scheduled fetches start before we begin polling for idle.
	const origWaitForLoadState = page.waitForLoadState.bind(page);
	page.waitForLoadState = (async (state, opts) => {
		if (state === 'networkidle') {
			await page.waitForTimeout(500);
		}
		return origWaitForLoadState(state, opts);
	}) as typeof page.waitForLoadState;
}

export const test = base.extend<
	{ asUser: AsUser; asAdmin: AsAdmin; page: Page },
	{ workerServer: WorkerServer }
>({
	workerServer: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use, workerInfo) => {
			const port = 4173 + workerInfo.parallelIndex;
			const urls = JSON.parse(process.env.E2E_WORKER_URLS ?? '[]') as string[];
			const databaseUrl = urls[workerInfo.parallelIndex];
			if (!databaseUrl) {
				throw new Error(
					`No DATABASE_URL for worker ${workerInfo.parallelIndex} — globalSetup did not run or ran with fewer workers.`
				);
			}

			const server = spawnPreview(port, databaseUrl);
			await waitForReady(server.url, 60_000);
			await use({ url: server.url, port });
			server.proc.kill('SIGTERM');
		},
		{ scope: 'worker', timeout: 60_000 }
	],
	baseURL: async ({ workerServer }, use) => {
		await use(workerServer.url);
	},
	page: async ({ page }, use) => {
		patchHydrationAware(page);
		await use(page);
	},
	asUser: async ({ browser, workerServer }, use) => {
		const contexts: BrowserContext[] = [];
		const fn: AsUser = async (prefix) => {
			const user = uniqueUser(prefix);
			const ctx = await browser.newContext({
				storageState: `e2e/.auth/${user.username}.json`,
				baseURL: workerServer.url
			});
			contexts.push(ctx);
			const page = await ctx.newPage();
			patchHydrationAware(page);
			return { user, page };
		};
		await use(fn);
		for (const ctx of contexts) await ctx.close();
	},
	asAdmin: async ({ browser, workerServer }, use) => {
		const contexts: BrowserContext[] = [];
		const fn: AsAdmin = async () => {
			const user = adminUser();
			const ctx = await browser.newContext({
				storageState: `e2e/.auth/${user.username}.json`,
				baseURL: workerServer.url
			});
			contexts.push(ctx);
			const page = await ctx.newPage();
			patchHydrationAware(page);
			return { user, page };
		};
		await use(fn);
		for (const ctx of contexts) await ctx.close();
	}
});

export { expect } from '@playwright/test';
