import 'dotenv/config';
import { execSync } from 'child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { confirm, log, intro, outro, isCancel } from '@clack/prompts';

const sqlitePath = process.env.SQLITE_PATH || '.data/skiftesgatan.db';

const skipConfirm = process.argv.slice(2).some((a) => a === '-y' || a === '--yes');

if (!skipConfirm) {
	intro('db:push');
	log.warn(`SQLITE_PATH: ${sqlitePath}`);
	const ok = await confirm({ message: 'Push schema to this database?' });
	if (isCancel(ok) || !ok) {
		outro('Aborted.');
		process.exit(0);
	}
}

mkdirSync(dirname(sqlitePath), { recursive: true });

execSync('pnpm exec drizzle-kit push', {
	stdio: 'inherit',
	env: { ...process.env, SQLITE_PATH: sqlitePath }
});
