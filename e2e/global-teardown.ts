import { readdirSync, rmSync } from 'node:fs';

export default async function globalTeardown() {
	for (const entry of readdirSync('.')) {
		if (entry.startsWith('.sqlite-test-')) {
			rmSync(entry, { force: true });
		}
	}
	rmSync('.auth', { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
}
