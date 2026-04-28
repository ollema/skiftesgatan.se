import { exec, loadProdEnv } from './env';

loadProdEnv();
exec('pnpm exec drizzle-kit studio');
