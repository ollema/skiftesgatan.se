import { generateRunId, cleanupAndCloneWorkers, replaceDb } from '../scripts/db/clone-template';
import { E2E_WORKERS } from '../playwright.config';

const TEMPLATE_DB = 'test_template';

export default async function globalSetup() {
	const adminUrl = process.env.DATABASE_URL_ADMIN;
	const baseUrl = process.env.DATABASE_URL;
	if (!adminUrl) throw new Error('DATABASE_URL_ADMIN required for e2e tests');
	if (!baseUrl) throw new Error('DATABASE_URL required for e2e tests');

	const runId = generateRunId(process.env);
	console.log(`[e2e] runId=${runId}`);

	const created = await cleanupAndCloneWorkers({
		adminUrl,
		templateDb: TEMPLATE_DB,
		workers: E2E_WORKERS,
		runId
	});

	// Hand the per-worker URLs to fixtures via env (Playwright spawns workers as separate processes).
	process.env.E2E_WORKER_URLS = JSON.stringify(created.map((db) => replaceDb(baseUrl, db)));
}
