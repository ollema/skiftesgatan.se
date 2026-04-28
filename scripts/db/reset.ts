import 'dotenv/config';
import postgres from 'postgres';
import { confirmReset, exec } from './env';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Add it to .env or override inline.');
	process.exit(1);
}

await confirmReset();

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
	await sql.unsafe('DROP SCHEMA public CASCADE');
	await sql.unsafe('CREATE SCHEMA public');
} finally {
	await sql.end();
}

exec('pnpm exec drizzle-kit push --force');
exec('pnpx tsx scripts/db/seed.ts');
console.log('✓ reset complete');
