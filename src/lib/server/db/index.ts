import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { SQLITE_PATH } from '$app/env/private';
import * as schema from './schema';

type Db = BetterSQLite3Database<typeof schema>;

const DEFAULT_PATH = '.data/skiftesgatan.db';

let _client: InstanceType<typeof Database> | undefined;
let _db: Db | undefined;

function makeDb(): Db {
	const path = SQLITE_PATH || DEFAULT_PATH;
	mkdirSync(dirname(path), { recursive: true });

	const client = new Database(path);
	// Per-connection pragmas: foreign keys are off by default in SQLite, so
	// every cascade in the schema depends on this. WAL keeps readers from
	// blocking the single writer, and busy_timeout absorbs short lock waits.
	client.pragma('journal_mode = WAL');
	client.pragma('foreign_keys = ON');
	client.pragma('busy_timeout = 5000');
	client.pragma('synchronous = NORMAL');

	_client = client;
	return drizzle(client, { schema });
}

// Lazy so importing server modules during a build never creates or opens the
// database file. Single-writer assumptions: keep the app at one process.
export const db = new Proxy({} as Db, {
	get(_, prop, receiver) {
		if (!_db) _db = makeDb();
		return Reflect.get(_db, prop, receiver);
	}
});

/** Close SQLite during graceful shutdown so the WAL is checkpointed cleanly. */
export function closeDb(): void {
	if (!_client) return;
	_client.close();
	_client = undefined;
	_db = undefined;
}
