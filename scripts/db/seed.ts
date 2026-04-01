import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { log, outro, intro } from '@clack/prompts';
import { today, getLocalTimeZone } from '@internationalized/date';
import { eq } from 'drizzle-orm';
import { parseEnv, setEnvVars } from './env.js';

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

const TIMESLOT_SEEDS = [
	{ startHour: 7, endHour: 10, resource: 'laundry_room' as const },
	{ startHour: 10, endHour: 13, resource: 'laundry_room' as const },
	{ startHour: 13, endHour: 16, resource: 'laundry_room' as const },
	{ startHour: 16, endHour: 19, resource: 'laundry_room' as const },
	{ startHour: 19, endHour: 22, resource: 'laundry_room' as const },
	{ startHour: 7, endHour: 22, resource: 'outdoor_area' as const }
];

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFutureDate() {
	return today(getLocalTimeZone())
		.add({ days: randomInt(1, 30) })
		.toString();
}

// --- Setup ---

const env = parseEnv();
setEnvVars(env);

// Dynamic imports after env vars are set so db/index.ts connects to the right database
const { db } = await import('../../src/lib/server/db/index.js');
const { timeslot, booking } = await import('../../src/lib/server/db/booking.schema.js');
const { user } = await import('../../src/lib/server/db/auth.schema.js');
const { APARTMENTS, APARTMENT_REGEX, PASSWORD_CONFIG, usernamePlugin } =
	await import('../../src/lib/server/auth.config.js');

const { betterAuth } = await import('better-auth/minimal');
const { drizzleAdapter } = await import('better-auth/adapters/drizzle');

const seedAuth = betterAuth({
	baseURL: 'http://localhost',
	secret: 'xK9mP2vQ7nR4sT8wF3jL6hG1dA5cB0eY',
	logger: { disabled: true },
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		...PASSWORD_CONFIG
	},
	emailVerification: {
		sendVerificationEmail: async () => {},
		sendOnSignUp: false
	},
	plugins: [usernamePlugin()]
});

// --- Main ---

if (env !== 'test') intro(`db:seed ${env}`);

// Timeslots (all envs)
for (const ts of TIMESLOT_SEEDS) {
	await db.insert(timeslot).values(ts).onConflictDoNothing();
}
log.info('Seeded 6 timeslots (5 laundry + 1 outdoor)');

// Accounts
if (env === 'prod') {
	await seedProdAccounts();
} else {
	await seedDevAccounts();
}

// Bookings (dev only)
if (env === 'dev') {
	await seedBookings();
}

if (env !== 'test') outro('Seeding complete.');
process.exit(0);

// --- Seed functions ---

async function seedDevAccounts() {
	let created = 0;
	for (let i = 0; i < APARTMENTS.length; i++) {
		const apt = APARTMENTS[i];
		try {
			await seedAuth.api.signUpEmail({
				body: {
					email: `${apt.toLowerCase()}@resend.dev`,
					password: `password-${apt}`,
					name: DEV_NAMES[i],
					username: apt
				}
			});
			created++;
		} catch {
			// Already exists — skip
		}
	}

	await db.update(user).set({ emailVerified: true }).where(eq(user.emailVerified, false));
	log.info(`Seeded ${created} accounts (${APARTMENTS.length - created} already existed)`);
}

async function seedProdAccounts() {
	const csvPath = process.argv[3] || 'accounts.csv';
	let csv: string;
	try {
		csv = readFileSync(csvPath, 'utf-8');
	} catch {
		log.error(`Could not read ${csvPath}. Provide a CSV with columns: username,email,name`);
		log.info('Usage: pnpm db:seed prod [path/to/accounts.csv]');
		process.exit(1);
	}

	const lines = csv
		.trim()
		.split('\n')
		.slice(1) // skip header
		.map((line) => line.split(',').map((c) => c.trim()));

	const credentials: { username: string; email: string; password: string }[] = [];

	for (const [apt, email, name] of lines) {
		if (!APARTMENT_REGEX.test(apt)) {
			log.warn(`Invalid apartment "${apt}" — skipping`);
			continue;
		}
		const password = crypto.randomBytes(16).toString('base64url');
		const displayName = name?.trim() || apt;

		try {
			await seedAuth.api.signUpEmail({
				body: { email, password, name: displayName, username: apt }
			});
			credentials.push({ username: apt, email, password });
		} catch (e) {
			log.error(`Failed to create ${apt}: ${e}`);
		}
	}

	await db.update(user).set({ emailVerified: true }).where(eq(user.emailVerified, false));

	log.info(`Created ${credentials.length} accounts.`);
	console.log('\nusername,email,password');
	for (const c of credentials) {
		console.log(`${c.username},${c.email},${c.password}`);
	}
}

async function seedBookings() {
	const users = await db.select({ id: user.id, username: user.username }).from(user);
	const userMap = new Map(users.map((u) => [u.username, u.id]));

	const timeslots = await db.select().from(timeslot);
	const laundrySlots = timeslots.filter((ts) => ts.resource === 'laundry_room');
	const outdoorSlot = timeslots.find((ts) => ts.resource === 'outdoor_area');

	let laundryCount = 0;
	let outdoorCount = 0;

	for (const apt of APARTMENTS.slice(0, 16)) {
		const userId = userMap.get(apt);
		if (!userId) continue;

		const slot = laundrySlots[randomInt(0, laundrySlots.length - 1)];
		await db
			.insert(booking)
			.values({ userId, timeslotId: slot.id, resource: 'laundry_room', date: randomFutureDate() })
			.onConflictDoNothing();
		laundryCount++;

		if (outdoorSlot && Math.random() < 0.4) {
			await db
				.insert(booking)
				.values({
					userId,
					timeslotId: outdoorSlot.id,
					resource: 'outdoor_area',
					date: randomFutureDate()
				})
				.onConflictDoNothing();
			outdoorCount++;
		}
	}

	log.info(`Seeded ${laundryCount} laundry + ${outdoorCount} outdoor bookings`);
}
