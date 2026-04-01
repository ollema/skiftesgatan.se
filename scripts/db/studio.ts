import { parseEnv, setEnvVars, exec } from './env.js';

const env = parseEnv(['dev', 'prod']);
setEnvVars(env);
exec('pnpm exec drizzle-kit studio');
