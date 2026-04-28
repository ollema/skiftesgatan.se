import { spawn, type ChildProcess } from 'node:child_process';

type SpawnedServer = { proc: ChildProcess; url: string };

// Fixed across globalSetup bake-auth, per-worker preview spawns, and CI —
// session cookies in e2e/.auth/ are signed with this secret. NOT a real
// secret; the test database is dummy data.
const TEST_AUTH_SECRET = 'ci-dummy-secret-not-for-production';

const SERVER_ENV = {
	RESEND_API_KEY: '',
	LOG_LEVEL: 'error',
	SKIP_ENV_VALIDATION: '1',
	RATE_LIMIT_DISABLED: '1',
	BETTER_AUTH_SECRET: TEST_AUTH_SECRET
} as const;

export function spawnPreview(port: number, pglitePath: string): SpawnedServer {
	const url = `http://localhost:${port}`;
	const proc = spawn('pnpm', ['preview', '--port', String(port)], {
		env: {
			...process.env,
			...SERVER_ENV,
			PGLITE_PATH: pglitePath,
			ORIGIN: url
		},
		stdio: 'pipe'
	});
	proc.on('error', (e) => {
		console.error(`[test-server] preview error on :${port}:`, e);
	});
	return { proc, url };
}

export async function waitForReady(url: string, timeoutMs = 30_000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url, { redirect: 'manual' });
			if (res.status > 0) return;
		} catch {
			// connection refused — server not up yet
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

export function runScript(cmd: string, args: string[], env: Record<string, string>): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn(cmd, args, {
			env: { ...process.env, ...env },
			stdio: 'inherit'
		});
		proc.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
		});
		proc.on('error', reject);
	});
}
