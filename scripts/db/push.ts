import { parseEnv, setEnvVars, confirmDestructive, exec } from './env.js';

const env = parseEnv(['dev', 'prod']);
setEnvVars(env);

if (env === 'prod') {
	await confirmDestructive(env, 'push prod');
}

exec('pnpm exec drizzle-kit push');
