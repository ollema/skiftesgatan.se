import 'dotenv/config';
import { execSync } from 'child_process';
import { confirm, log, intro, outro, isCancel } from '@clack/prompts';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Add it to .env or override inline.');
	process.exit(1);
}

const skipConfirm = process.argv.slice(2).some((a) => a === '-y' || a === '--yes');

if (!skipConfirm) {
	intro('db:push');
	log.warn(`DATABASE_URL: ${process.env.DATABASE_URL}`);
	const ok = await confirm({ message: 'Push schema to this database?' });
	if (isCancel(ok) || !ok) {
		outro('Aborted.');
		process.exit(0);
	}
}

execSync('pnpm exec drizzle-kit push', { stdio: 'inherit', env: process.env });
