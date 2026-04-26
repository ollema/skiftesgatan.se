import { rmSync } from 'node:fs';
import { log, outro } from '@clack/prompts';
import { parseEnv, setEnvVars, confirmDestructive, exec } from './env.js';

const env = parseEnv(['test', 'dev']);
setEnvVars(env);

if (env === 'test') {
	rmSync('.pglite-test', { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
} else {
	await confirmDestructive(env, 'reset dev');
	rmSync('.pglite', { recursive: true, force: true });
	log.info('Deleted .pglite');
}

exec('pnpm exec drizzle-kit push --force');

if (env !== 'test') {
	outro('Database reset complete.');
}
