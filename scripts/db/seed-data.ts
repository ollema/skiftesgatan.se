import { today } from '@internationalized/date';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PASSWORD_CONFIG, usernamePlugin } from '../../src/lib/server/auth.config.js';
import { user } from '../../src/lib/server/db/auth.schema.js';
import { booking, timeslot } from '../../src/lib/server/db/booking.schema.js';
import * as schema from '../../src/lib/server/db/schema.js';

export const APARTMENTS: string[] = [];
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
	return today('Europe/Stockholm')
		.add({ days: randomInt(1, 30) })
		.toString();
}

export async function seedDatabase(databaseUrl: string, opts: { withBookings: boolean }) {
	const client = postgres(databaseUrl);
	try {
		const db = drizzle(client, { schema });

		const seedAuth = betterAuth({
			baseURL: 'http://localhost',
			secret: 'xK9mP2vQ7nR4sT8wF3jL6hG1dA5cB0eY',
			logger: { disabled: true },
			database: drizzleAdapter(db, { provider: 'pg' }),
			emailAndPassword: { enabled: true, requireEmailVerification: false, ...PASSWORD_CONFIG },
			emailVerification: { sendVerificationEmail: async () => {}, sendOnSignUp: false },
			plugins: [usernamePlugin()]
		});

		// Timeslots
		for (const ts of TIMESLOT_SEEDS) {
			await db.insert(timeslot).values(ts).onConflictDoNothing();
		}

		// Accounts
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

		if (opts.withBookings) {
			const users = await db.select({ id: user.id, username: user.username }).from(user);
			const userMap = new Map(users.map((u) => [u.username, u.id]));
			const timeslots = await db.select().from(timeslot);
			const laundrySlots = timeslots.filter((ts) => ts.resource === 'laundry_room');
			const outdoorSlot = timeslots.find((ts) => ts.resource === 'outdoor_area');

			for (const apt of APARTMENTS.slice(0, 16)) {
				const userId = userMap.get(apt);
				if (!userId) continue;
				const slot = laundrySlots[randomInt(0, laundrySlots.length - 1)];
				await db
					.insert(booking)
					.values({
						userId,
						timeslotId: slot.id,
						resource: 'laundry_room',
						date: randomFutureDate()
					})
					.onConflictDoNothing();
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
				}
			}
		}
	} finally {
		await client.end();
	}
}
