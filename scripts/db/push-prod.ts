import { confirmDestructiveProd, exec, loadProdEnv } from './env';

loadProdEnv();
await confirmDestructiveProd('push prod');
exec('pnpm exec drizzle-kit push');
