import 'dotenv/config';
import { spawn } from 'node:child_process';
import { generateRunId, cleanupAndCloneWorkers, replaceDb } from '../scripts/db/clone-template';
import { E2E_WORKERS } from '../playwright.config';

const TEMPLATE_DB = 'test_template';

function runBuild(): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn('pnpm', ['build'], { stdio: 'inherit' });
		proc.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`pnpm build exited with code ${code}`));
		});
		proc.on('error', reject);
	});
}

export default async function globalSetup() {
	const adminUrl = process.env.DATABASE_URL_ADMIN;
	const baseUrl = process.env.DATABASE_URL;
	if (!adminUrl) throw new Error('DATABASE_URL_ADMIN required for e2e tests');
	if (!baseUrl) throw new Error('DATABASE_URL required for e2e tests');

	const runId = generateRunId(process.env);
	console.log(`[e2e] runId=${runId}`);

	console.log('[e2e] building app...');
	await runBuild();

	const created = await cleanupAndCloneWorkers({
		adminUrl,
		templateDb: TEMPLATE_DB,
		workers: E2E_WORKERS,
		runId
	});

	// Hand the per-worker URLs to fixtures via env (Playwright spawns workers as separate processes).
	process.env.E2E_WORKER_URLS = JSON.stringify(created.map((db) => replaceDb(baseUrl, db)));
}
