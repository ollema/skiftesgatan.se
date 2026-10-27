import dns from 'node:dns';
import { spawn, type ChildProcess } from 'node:child_process';

// Playwright's container images resolve `localhost` differently from the host
// runners (IPv6 first), which leaves the preview servers unreachable over IPv4
// when the two ends disagree on the address family. Pin both sides to IPv4.
dns.setDefaultResultOrder('ipv4first');

type SpawnedServer = { proc: ChildProcess; url: string };

// Pin a fixed secret so the global-setup session bake and the per-worker
// preview servers sign and verify cookies with the same key, regardless of
// what `.env` or the host environment provides.
export const TEST_AUTH_SECRET = 'ci-dummy-secret-not-for-production';

const SERVER_ENV = {
	RESEND_API_KEY: '',
	LOG_LEVEL: 'error',
	SKIP_ENV_VALIDATION: '1',
	RATE_LIMIT_DISABLED: '1',
	BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
	NODE_OPTIONS: '--dns-result-order=ipv4first'
} as const;

export function spawnPreview(port: number, dbPath: string): SpawnedServer {
	const url = `http://localhost:${port}`;
	const proc = spawn('pnpm', ['preview', '--port', String(port)], {
		env: {
			...process.env,
			...SERVER_ENV,
			PGLITE_PATH: dbPath,
			ORIGIN: url
		},
		stdio: 'pipe'
	});
	proc.on('error', (e) => {
		console.error(`[test-server] preview error on :${port}:`, e);
	});
	proc.stdout?.on('data', (chunk: Buffer) => {
		process.stdout.write(`[preview:${port}] ${chunk}`);
	});
	proc.stderr?.on('data', (chunk: Buffer) => {
		process.stderr.write(`[preview:${port}] ${chunk}`);
	});
	proc.on('exit', (code, signal) => {
		if (code !== 0 && signal !== 'SIGTERM') {
			console.error(`[test-server] preview on :${port} exited (code=${code}, signal=${signal})`);
		}
	});
	return { proc, url };
}

export async function waitForReady(url: string, timeoutMs = 30_000): Promise<void> {
	const start = Date.now();
	let lastError: unknown;
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url, { redirect: 'manual' });
			if (res.status > 0) return;
		} catch (error) {
			lastError = error;
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(
		`Server at ${url} did not become ready within ${timeoutMs}ms (last error: ${lastError}${
			lastError instanceof Error && lastError.cause ? `, cause: ${lastError.cause}` : ''
		})`
	);
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
