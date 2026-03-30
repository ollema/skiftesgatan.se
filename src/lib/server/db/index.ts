import * as schema from './schema';

const createDb = async () => {
	if (!process.env.DATABASE_URL) {
		const { PGlite } = await import('@electric-sql/pglite');
		const { drizzle } = await import('drizzle-orm/pglite');
		const client = new PGlite(process.env.PGLITE_PATH || '.pglite');
		return drizzle({ client, schema });
	}
	const postgres = (await import('postgres')).default;
	const { drizzle } = await import('drizzle-orm/postgres-js');
	const client = postgres(process.env.DATABASE_URL);
	return drizzle(client, { schema });
};

export const db = await createDb();
