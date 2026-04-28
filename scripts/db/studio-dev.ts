import 'dotenv/config';
import { exec } from './env';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Add it to .env.');
	process.exit(1);
}

exec('pnpm exec drizzle-kit studio');
