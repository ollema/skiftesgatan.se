import { spawn } from 'node:child_process';
import postgres from 'postgres';
import { bakeAuthForTemplate } from './bake-auth';
import { replaceDb } from './clone-template';
import { APARTMENTS, seedDatabase } from './seed-data';

const TEMPLATE_DB = 'test_template';

const adminUrl = process.env.DATABASE_URL_ADMIN;
if (!adminUrl) {
	console.error('DATABASE_URL_ADMIN is required for db:reset:test');
	process.exit(1);
}
const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
	console.error('DATABASE_URL is required for db:reset:test (used as a base for derived URLs)');
	process.exit(1);
}

const templateUrl = replaceDb(baseUrl, TEMPLATE_DB);

async function main() {
	const sql = postgres(adminUrl, { max: 1 });
	try {
		// 1. Unmark IS_TEMPLATE if it was set (otherwise DROP fails). May error if the
		//    DB doesn't exist yet — that's fine, DROP IF EXISTS handles that case.
		try {
			await sql.unsafe(`ALTER DATABASE "${TEMPLATE_DB}" WITH IS_TEMPLATE = false`);
		} catch {
			/* DB doesn't exist yet — proceed to CREATE below */
		}
		// 2. Terminate any connections to the template
		await sql.unsafe(`
			SELECT pg_terminate_backend(pid) FROM pg_stat_activity
			WHERE datname = '${TEMPLATE_DB}' AND pid <> pg_backend_pid()
		`);
		// 3. Drop and recreate
		await sql.unsafe(`DROP DATABASE IF EXISTS "${TEMPLATE_DB}" WITH (FORCE)`);
		await sql.unsafe(`CREATE DATABASE "${TEMPLATE_DB}"`);
	} finally {
		await sql.end();
	}

	// 4. Push schema
	await runDrizzlePush(templateUrl);

	// 5. Seed (timeslots + accounts; no bookings — those are dev-only)
	await seedDatabase(templateUrl, { withBookings: false });

	// 6. Bake auth state JSONs (32 logins in parallel)
	await bakeAuthForTemplate({ databaseUrl: templateUrl, usernames: APARTMENTS });

	// 7. Terminate any leftover connections to template, then mark IS_TEMPLATE
	const sql2 = postgres(adminUrl, { max: 1 });
	try {
		await sql2.unsafe(`
			SELECT pg_terminate_backend(pid) FROM pg_stat_activity
			WHERE datname = '${TEMPLATE_DB}' AND pid <> pg_backend_pid()
		`);
		await sql2.unsafe(`ALTER DATABASE "${TEMPLATE_DB}" WITH IS_TEMPLATE = true`);
	} finally {
		await sql2.end();
	}

	console.log(`✓ ${TEMPLATE_DB} ready (IS_TEMPLATE=true), e2e/.auth/*.json baked`);
}

function runDrizzlePush(databaseUrl: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
			env: { ...process.env, DATABASE_URL: databaseUrl },
			stdio: 'inherit'
		});
		proc.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`drizzle-kit push exited with code ${code}`));
		});
	});
}

await main();
