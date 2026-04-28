import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type Db =
	| ReturnType<typeof drizzlePg<typeof schema>>
	| ReturnType<typeof drizzlePglite<typeof schema>>;

function makeDb(): Db {
	if (env.PGLITE_PATH) {
		return drizzlePglite(new PGlite(env.PGLITE_PATH), { schema });
	}
	if (env.DATABASE_URL) {
		return drizzlePg(postgres(env.DATABASE_URL), { schema });
	}
	throw new Error('DATABASE_URL or PGLITE_PATH required');
}

let _db: Db | undefined;
export const db = new Proxy({} as Db, {
	get(_, prop, receiver) {
		if (!_db) _db = makeDb();
		return Reflect.get(_db, prop, receiver);
	}
});
