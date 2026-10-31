import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: process.env.SQLITE_PATH || '.data/skiftesgatan.db' },
	verbose: true,
	strict: true
});
