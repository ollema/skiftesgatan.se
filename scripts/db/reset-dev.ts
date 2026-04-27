import 'dotenv/config';
import postgres from 'postgres';
import { confirmDestructiveDev, exec } from './env';
import { seedDatabase } from './seed-data';

const adminUrl = process.env.DATABASE_URL_ADMIN;
const baseUrl = process.env.DATABASE_URL;
if (!adminUrl) {
	console.error('DATABASE_URL_ADMIN is required for db:reset:dev');
	process.exit(1);
}
if (!baseUrl) {
	console.error('DATABASE_URL is required for db:reset:dev');
	process.exit(1);
}

await confirmDestructiveDev('reset dev');

const sql = postgres(adminUrl, { max: 1 });
try {
	await sql.unsafe(`
		SELECT pg_terminate_backend(pid) FROM pg_stat_activity
		WHERE datname = 'dev' AND pid <> pg_backend_pid()
	`);
	await sql.unsafe('DROP DATABASE IF EXISTS "dev" WITH (FORCE)');
	await sql.unsafe('CREATE DATABASE "dev"');
} finally {
	await sql.end();
}

exec('pnpm exec drizzle-kit push --force');
await seedDatabase(baseUrl, { withBookings: true });
console.log('✓ dev reset complete');
