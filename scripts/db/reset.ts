import { rmSync } from 'node:fs';
import { log, outro } from '@clack/prompts';
import { parseEnv, setEnvVars, confirmDestructive, exec, dropFlag } from './env.js';

const env = parseEnv();
setEnvVars(env);

if (env === 'test') {
	rmSync('.pglite-test', { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
} else if (env === 'dev') {
	await confirmDestructive(env, 'reset dev');
	rmSync('.pglite', { recursive: true, force: true });
	log.info('Deleted .pglite');
} else if (dropFlag) {
	await confirmDestructive(env, 'reset prod --drop');
	const postgres = (await import('postgres')).default;
	const sql = postgres(process.env.DATABASE_URL!, { connect_timeout: 5 });
	try {
		await sql`DROP SCHEMA public CASCADE`;
		await sql`CREATE SCHEMA public`;
		await sql.end();
	} catch (e) {
		log.error(`Failed to connect. Is the tunnel running? (pnpm db:tunnel)\n${e}`);
		process.exit(1);
	}
	log.info('Dropped and recreated public schema');
}

exec('pnpm exec drizzle-kit push --force');

if (env !== 'test') {
	outro(env === 'prod' && !dropFlag ? 'Schema pushed.' : 'Database reset complete.');
}
