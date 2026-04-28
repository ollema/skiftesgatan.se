import { defineConfig } from 'drizzle-kit';

const pglitePath = process.env.PGLITE_PATH;
const dbUrl = process.env.DATABASE_URL;

if (!pglitePath && !dbUrl) {
	throw new Error('PGLITE_PATH or DATABASE_URL is required for drizzle-kit');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	driver: pglitePath ? 'pglite' : undefined,
	dbCredentials: pglitePath ? { url: pglitePath } : { url: dbUrl! },
	verbose: true,
	strict: true
});
