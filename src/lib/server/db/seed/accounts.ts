import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { user } from '../auth.schema';
import { APARTMENTS, PASSWORD_CONFIG, usernamePlugin } from '../../auth.config';

// One fictional name per apartment, ordered to match APARTMENTS (A1001..D1302)
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

async function seedAccounts() {
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

	console.log(`Seeded ${created} accounts (${APARTMENTS.length - created} already existed)`);
}

seedAccounts()
	.catch(console.error)
	.then(() => process.exit(0));
