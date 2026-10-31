import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import * as schema from './schema';

export type TestDb = BetterSQLite3Database<typeof schema>;
export type TestClient = Database.Database;

/**
 * `pushSQLiteSchema` from drizzle-kit calls `.all()` on every statement, which
 * better-sqlite3 rejects for DDL, so generate the create statements once and
 * replay them into each in-memory database.
 */
let schemaSqlPromise: Promise<string[]> | undefined;

function schemaSql(): Promise<string[]> {
	schemaSqlPromise ??= (async () => {
		const current = await generateSQLiteDrizzleJson(schema);
		const empty = {
			id: '00000000-0000-0000-0000-000000000000',
			prevId: '00000000-0000-0000-0000-000000000000',
			version: '6',
			dialect: 'sqlite',
			tables: {},
			enums: {},
			views: {},
			_meta: { columns: {}, tables: {}, schemas: {} }
		};
		const statements = await generateSQLiteMigration(empty as never, current as never);
		return statements.filter((statement) => statement.trim().length > 0);
	})();
	return schemaSqlPromise;
}

export async function makeTestDb(): Promise<{ client: TestClient; db: TestDb }> {
	const client = new Database(':memory:');
	client.pragma('foreign_keys = ON');

	for (const statement of await schemaSql()) {
		client.exec(statement);
	}

	return { client, db: drizzle(client, { schema }) };
}
