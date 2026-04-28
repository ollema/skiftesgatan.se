import 'dotenv/config';
import { execSync } from 'child_process';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Add it to .env or override inline.');
	process.exit(1);
}

execSync('pnpm exec drizzle-kit studio', { stdio: 'inherit', env: process.env });
