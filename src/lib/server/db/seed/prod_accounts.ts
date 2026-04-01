import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { user } from '../auth.schema';
import { APARTMENT_REGEX, PASSWORD_CONFIG, usernamePlugin } from '../../auth.config';

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

// TODO: Decide on password distribution strategy:
// Option A: Generate random passwords, output to stdout for manual distribution
// Option B: Create accounts without usable password, send password-reset emails to each user

async function seedProd() {
	const csvPath = process.argv[2] || 'accounts.csv';
	let csv: string;
	try {
		csv = readFileSync(csvPath, 'utf-8');
	} catch {
		console.error(`Could not read ${csvPath}. Provide a CSV with columns: username,email,name`);
		console.error('Usage: pnpx tsx src/lib/server/db/seed/prod_accounts.ts [path/to/accounts.csv]');
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
			console.error(`Invalid apartment "${apt}" — skipping`);
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
			console.error(`Failed to create ${apt}: ${e}`);
		}
	}

	await db.update(user).set({ emailVerified: true }).where(eq(user.emailVerified, false));

	console.log(`\nCreated ${credentials.length} accounts.\n`);
	console.log('username,email,password');
	for (const c of credentials) {
		console.log(`${c.username},${c.email},${c.password}`);
	}
}

seedProd()
	.catch(console.error)
	.then(() => process.exit(0));
