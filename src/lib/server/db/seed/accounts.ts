import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { user } from '../auth.schema';
import { APARTMENTS, PASSWORD_CONFIG, usernamePlugin } from '../../auth.config';

const seedAuth = betterAuth({
	baseURL: 'http://localhost',
	secret: 'seed-secret',
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
	for (const apt of APARTMENTS) {
		try {
			await seedAuth.api.signUpEmail({
				body: {
					email: `delivered+${apt}@resend.dev`,
					password: `password-${apt}`,
					name: apt,
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
