import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import { PGLITE_PATH, DATABASE_URL } from '$app/env/private';
import * as schema from './schema';

type Db =
	| ReturnType<typeof drizzlePg<typeof schema>>
	| ReturnType<typeof drizzlePglite<typeof schema>>;

function makeDb(): Db {
	if (PGLITE_PATH) {
		return drizzlePglite(new PGlite(PGLITE_PATH), { schema });
	}
	if (DATABASE_URL) {
		return drizzlePg(postgres(DATABASE_URL), { schema });
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
