import postgres from 'postgres';

export type ParsedTestDbName = {
	runId: string;
	workerIndex: number;
};

const TEST_DB_RE = /^test_([0-9a-z]+)_w(\d+)$/;

export function parseTestDbName(name: string): ParsedTestDbName | null {
	const m = name.match(TEST_DB_RE);
	if (!m) return null;
	return { runId: m[1], workerIndex: Number(m[2]) };
}

export function generateRunId(
	env: { GITHUB_RUN_ID?: string; GITHUB_RUN_ATTEMPT?: string },
	now: () => number = Date.now
): string {
	if (env.GITHUB_RUN_ID) {
		const attempt = Number(env.GITHUB_RUN_ATTEMPT ?? '1');
		return attempt > 1 ? `${env.GITHUB_RUN_ID}a${attempt}` : env.GITHUB_RUN_ID;
	}
	return Math.floor(now() / 1000).toString();
}

/** Returns names of test DBs older than `thresholdSeconds`. CI-style runIds (non-numeric) are
 *  never filtered by age — they're left for the next run that knows their age, or to a CI cleanup step. */
export function filterStaleTestDbs(
	names: string[],
	nowSeconds: number,
	thresholdSeconds: number
): string[] {
	const stale: string[] = [];
	for (const name of names) {
		const parsed = parseTestDbName(name);
		if (!parsed) continue;
		if (!/^\d+$/.test(parsed.runId)) continue;
		const age = nowSeconds - Number(parsed.runId);
		if (age > thresholdSeconds) stale.push(name);
	}
	return stale;
}

const STALE_THRESHOLD_SECONDS = 3600;

/** Drops stale `test_*` DBs and creates one fresh DB per worker by cloning `test_template`.
 *  Returns the list of created database names, indexed by workerIndex. */
export async function cleanupAndCloneWorkers(opts: {
	adminUrl: string;
	templateDb: string;
	workers: number;
	runId: string;
}): Promise<string[]> {
	const sql = postgres(opts.adminUrl, { max: 1 });
	try {
		const rows = await sql<{ datname: string }[]>`
			SELECT datname FROM pg_database WHERE datname LIKE 'test_%'
		`;
		const names = rows.map((r) => r.datname);
		const nowSeconds = Math.floor(Date.now() / 1000);
		const stale = filterStaleTestDbs(names, nowSeconds, STALE_THRESHOLD_SECONDS);
		for (const name of stale) {
			await sql.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		}

		const created: string[] = [];
		for (let w = 0; w < opts.workers; w++) {
			const dbName = `test_${opts.runId}_w${w}`;
			await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
			await sql.unsafe(`CREATE DATABASE "${dbName}" TEMPLATE "${opts.templateDb}"`);
			created.push(dbName);
		}
		return created;
	} finally {
		await sql.end();
	}
}

/** Replaces the pathname segment of a Postgres URL. */
export function replaceDb(connectionString: string, dbName: string): string {
	const url = new URL(connectionString);
	url.pathname = `/${dbName}`;
	return url.toString();
}
