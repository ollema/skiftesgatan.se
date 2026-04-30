import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { PASSWORD_CONFIG, usernamePlugin } from '../../src/lib/server/auth.config.js';
import { user } from '../../src/lib/server/db/auth.schema.js';
import * as schema from '../../src/lib/server/db/schema.js';
import { seedTimeBlocks } from '../../src/lib/server/db/seed-time-blocks.js';

const pglitePath = process.env.PGLITE_PATH;
if (!pglitePath) {
	console.error('PGLITE_PATH is required for seed-test');
	process.exit(1);
}

const APARTMENTS: string[] = [];
for (const block of ['A', 'B', 'C', 'D']) {
	for (const floor of [0, 1, 2, 3]) {
		for (const door of [1, 2]) {
			APARTMENTS.push(`${block}1${floor}0${door}`);
		}
	}
}

// Display names must be distinct from apartment numbers — admin.e2e.ts
// queries by `getByRole('cell', { name: 'B1001', exact: true })`, which
// fires a strict-mode violation if both columns contain the same string.
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

const client = new PGlite(pglitePath);
const db = drizzle(client, { schema });

const seedAuth = betterAuth({
	baseURL: 'http://localhost',
	secret: 'ci-dummy-secret-not-for-production',
	logger: { disabled: true },
	database: drizzleAdapter(db, { provider: 'pg' }),
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

await client.close();
console.log('✓ test seeded');
