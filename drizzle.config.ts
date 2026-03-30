import { defineConfig } from 'drizzle-kit';

const isPglite = !process.env.DATABASE_URL;

export default defineConfig(
	isPglite
		? {
				schema: './src/lib/server/db/schema.ts',
				dialect: 'postgresql',
				driver: 'pglite',
				dbCredentials: { url: process.env.PGLITE_PATH || '.pglite' },
				verbose: true,
				strict: true
			}
		: {
				schema: './src/lib/server/db/schema.ts',
				dialect: 'postgresql',
				dbCredentials: { url: process.env.DATABASE_URL! },
				verbose: true,
				strict: true
			}
);
