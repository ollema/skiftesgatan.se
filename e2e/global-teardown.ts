import { readdirSync, rmSync } from 'node:fs';

export default async function globalTeardown() {
	for (const entry of readdirSync('.')) {
		if (entry.startsWith('.pglite-test-w') || entry === '.pglite-test-template') {
			rmSync(entry, { recursive: true, force: true });
		}
	}
	rmSync('.auth', { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
}
