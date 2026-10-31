import 'dotenv/config';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { confirm, log, intro, outro, isCancel } from '@clack/prompts';
import { today } from '@internationalized/date';
import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { PASSWORD_CONFIG, usernamePlugin } from '../../src/lib/server/auth.config.js';
import { user } from '../../src/lib/server/db/auth.schema.js';
import { booking, timeBlock } from '../../src/lib/server/db/booking.schema.js';
import * as schema from '../../src/lib/server/db/schema.js';
import { seedTimeBlocks } from '../../src/lib/server/db/seed-time-blocks.js';

const sqlitePath = process.env.SQLITE_PATH || '.data/skiftesgatan.db';

const skipConfirm = process.argv.slice(2).some((a) => a === '-y' || a === '--yes');

if (!skipConfirm) {
	intro('db:reset');
	log.warn(`SQLITE_PATH: ${sqlitePath}`);
	const ok = await confirm({
		message: 'Reset this database? (drops all data, re-seeds dev fixtures)'
	});
	if (isCancel(ok) || !ok) {
		outro('Aborted.');
		process.exit(0);
	}
}

// Remove the database and any WAL sidecars so drizzle-kit starts from scratch.
for (const path of [sqlitePath, `${sqlitePath}-wal`, `${sqlitePath}-shm`]) {
	if (existsSync(path)) rmSync(path, { force: true });
}
mkdirSync(dirname(sqlitePath), { recursive: true });

execSync(`pnpm exec drizzle-kit push --force`, {
	stdio: 'inherit',
	env: { ...process.env, SQLITE_PATH: sqlitePath }
});

const APARTMENTS: string[] = [];
for (const block of ['A', 'B', 'C', 'D']) {
	for (const floor of [0, 1, 2, 3]) {
		for (const door of [1, 2]) {
			APARTMENTS.push(`${block}1${floor}0${door}`);
		}
	}
}

const DEV_NAMES = [
	'Anna Lindqvist',
	'Erik Johansson',
	'Maria Svensson',
	'Lars Andersson',
	'Karin Nilsson',
	'Johan Pettersson',
	'Eva Karlsson',
	'Anders Gustafsson',
	'Ingrid Olsson',
	'Nils Persson',
	'Birgitta Eriksson',
	'Sven Larsson',
	'Astrid Bergström',
	'Karl Lundgren',
	'Helena Fredriksson',
	'Per Sandberg',
	'Sofia Holm',
	'Magnus Lindberg',
	'Lena Forsberg',
	'Ola Nyström',
	'Margareta Engström',
	'Gunnar Sjöberg',
	'Kristina Wallin',
	'Bengt Ekström',
	'Annika Danielsson',
	'Håkan Magnusson',
	'Cecilia Björk',
	'Torbjörn Lund',
	'Malin Berglund',
	'Stefan Norberg',
	'Elin Hellström',
	'Mikael Fransson'
];

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFutureDate() {
	return today('Europe/Stockholm')
		.add({ days: randomInt(1, 30) })
		.toString();
}

const client = new Database(sqlitePath);
client.pragma('foreign_keys = ON');
try {
	const db = drizzle(client, { schema });

	const seedAuth = betterAuth({
		baseURL: 'http://localhost',
		secret: 'xK9mP2vQ7nR4sT8wF3jL6hG1dA5cB0eY',
		logger: { disabled: true },
		database: drizzleAdapter(db, { provider: 'sqlite' }),
		emailAndPassword: { enabled: true, requireEmailVerification: false, ...PASSWORD_CONFIG },
		emailVerification: { sendVerificationEmail: async () => {}, sendOnSignUp: false },
		plugins: [usernamePlugin()]
	});

	await seedTimeBlocks(db);

	for (let i = 0; i < APARTMENTS.length; i++) {
		const apt = APARTMENTS[i];
		try {
			await seedAuth.api.signUpEmail({
				body: {
					email: `delivered+${apt}@resend.dev`,
					password: `password-${apt}`,
					name: DEV_NAMES[i],
					username: apt
				}
			});
		} catch {
			// already exists
		}
	}
	await db.update(user).set({ emailVerified: true }).where(eq(user.emailVerified, false));
	await db.update(user).set({ role: 'admin' }).where(eq(user.username, 'B1001'));

	const users = await db.select({ id: user.id, username: user.username }).from(user);
	const userMap = new Map(users.map((u) => [u.username, u.id]));
	const timeBlocks = await db.select().from(timeBlock);
	const laundryBlocks = timeBlocks.filter((tb) => tb.resource === 'laundry_room');
	const outdoorBlock = timeBlocks.find((tb) => tb.resource === 'outdoor_area');

	for (const apt of APARTMENTS.slice(0, 16)) {
		const userId = userMap.get(apt);
		if (!userId) continue;
		const block = laundryBlocks[randomInt(0, laundryBlocks.length - 1)];
		await db
			.insert(booking)
			.values({
				userId,
				timeBlockId: block.id,
				resource: 'laundry_room',
				date: randomFutureDate()
			})
			.onConflictDoNothing();
		if (outdoorBlock && Math.random() < 0.4) {
			await db
				.insert(booking)
				.values({
					userId,
					timeBlockId: outdoorBlock.id,
					resource: 'outdoor_area',
					date: randomFutureDate()
				})
				.onConflictDoNothing();
		}
	}
} finally {
	client.close();
}

console.log('✓ reset complete');
