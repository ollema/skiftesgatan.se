import 'dotenv/config';
import { execSync } from 'child_process';
import { confirm, log, intro, outro, isCancel } from '@clack/prompts';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Add it to .env or override inline.');
	process.exit(1);
}

const skipConfirm = process.argv.slice(2).some((a) => a === '-y' || a === '--yes');

if (!skipConfirm) {
	intro('db:reset');
	log.warn(`DATABASE_URL: ${process.env.DATABASE_URL}`);
	const ok = await confirm({ message: 'Reset this database? (drops all data)' });
	if (isCancel(ok) || !ok) {
		outro('Aborted.');
		process.exit(0);
	}
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
	await sql.unsafe('DROP SCHEMA public CASCADE');
	await sql.unsafe('CREATE SCHEMA public');
} finally {
	await sql.end();
}

execSync('pnpm exec drizzle-kit push --force', { stdio: 'inherit', env: process.env });
execSync('pnpx tsx scripts/db/seed.ts', { stdio: 'inherit', env: process.env });
console.log('✓ reset complete');
