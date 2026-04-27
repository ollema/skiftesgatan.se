import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { cpSync, rmSync } from 'node:fs';
import { uniqueUser, adminUser } from './helpers';
import { spawnPreview, waitForReady } from './test-server';

type TestUser = { username: string; password: string; email: string };
type WorkerServer = { url: string; port: number };
type AsUser = (prefix: string) => Promise<{ user: TestUser; page: Page }>;
type AsAdmin = () => Promise<{ user: TestUser; page: Page }>;

export const test = base.extend<
	{ asUser: AsUser; asAdmin: AsAdmin },
	{ workerServer: WorkerServer }
>({
	workerServer: [
		// eslint-disable-next-line no-empty-pattern
		async ({}, use, workerInfo) => {
			const port = 4173 + workerInfo.workerIndex;
			const dbPath = `.pglite-test-w${workerInfo.workerIndex}`;
			rmSync(dbPath, { recursive: true, force: true });
			cpSync('.pglite-test-template', dbPath, { recursive: true });

			const server = spawnPreview(port, dbPath);
			await waitForReady(server.url, 60_000);
			await use({ url: server.url, port });
			server.proc.kill('SIGTERM');
			rmSync(dbPath, { recursive: true, force: true });
		},
		{ scope: 'worker', timeout: 60_000 }
	],
	baseURL: async ({ workerServer }, use) => {
		await use(workerServer.url);
	},
	asUser: async ({ browser, workerServer }, use) => {
		const contexts: BrowserContext[] = [];
		const fn: AsUser = async (prefix) => {
			const user = uniqueUser(prefix);
			const ctx = await browser.newContext({
				storageState: `.auth/${user.username}.json`,
				baseURL: workerServer.url
			});
			contexts.push(ctx);
			const page = await ctx.newPage();
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
				storageState: `.auth/${user.username}.json`,
				baseURL: workerServer.url
			});
			contexts.push(ctx);
			const page = await ctx.newPage();
			return { user, page };
		};
		await use(fn);
		for (const ctx of contexts) await ctx.close();
	}
});

export { expect } from '@playwright/test';
