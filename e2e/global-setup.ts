import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/pglite';
import { PASSWORD_CONFIG, usernamePlugin } from '../src/lib/server/auth.config.js';
import * as schema from '../src/lib/server/db/schema.js';
import { runScript, TEST_AUTH_SECRET } from './test-server';

const TEMPLATE_PATH = '.pglite-test-template';
const AUTH_DIR = '.auth';

const APARTMENTS: string[] = [];
for (const block of ['A', 'B', 'C', 'D']) {
	for (const floor of [0, 1, 2, 3]) {
		for (const door of [1, 2]) {
			APARTMENTS.push(`${block}1${floor}0${door}`);
		}
	}
}

export default async function globalSetup() {
	rmSync(TEMPLATE_PATH, { recursive: true, force: true });
	rmSync(AUTH_DIR, { recursive: true, force: true });
	rmSync('.test-emails', { recursive: true, force: true });
	mkdirSync(AUTH_DIR);

	// drizzle.config.ts switches drivers on `!DATABASE_URL`. Local `.env` may
	// have DATABASE_URL set for dev — scrub it so drizzle-kit pushes into the
	// PGlite template, not into the dev Postgres.
	await runScript('pnpm', ['exec', 'drizzle-kit', 'push', '--force'], {
		PGLITE_PATH: TEMPLATE_PATH,
		DATABASE_URL: ''
	});
	await runScript('pnpx', ['tsx', 'scripts/db/seed-test.ts'], { PGLITE_PATH: TEMPLATE_PATH });
	await runScript('pnpm', ['build'], {});

	await bakeStorageStates();
}

async function bakeStorageStates() {
	const client = new PGlite(TEMPLATE_PATH);
	try {
		const db = drizzle(client, { schema });
		const auth = betterAuth({
			baseURL: 'http://localhost',
			secret: TEST_AUTH_SECRET,
			logger: { disabled: true },
			database: drizzleAdapter(db, { provider: 'pg' }),
			emailAndPassword: {
				enabled: true,
				requireEmailVerification: false,
				...PASSWORD_CONFIG
			},
			plugins: [usernamePlugin()]
		});

		for (const username of APARTMENTS) {
			const result = await auth.api.signInUsername({
				body: { username, password: `password-${username}` },
				returnHeaders: true
			});
			const setCookies = result.headers?.getSetCookie() ?? [];
			if (setCookies.length === 0) {
				throw new Error(`No Set-Cookie header returned when baking session for ${username}`);
			}
			const cookies = setCookies.map((raw) => parseSetCookieForStorageState(raw));
			writeFileSync(`${AUTH_DIR}/${username}.json`, JSON.stringify({ cookies, origins: [] }));
		}
	} finally {
		await client.close();
	}
}

type PlaywrightCookie = {
	name: string;
	value: string;
	domain: string;
	path: string;
	expires: number;
	httpOnly: boolean;
	secure: boolean;
	sameSite: 'Strict' | 'Lax' | 'None';
};

function parseSetCookieForStorageState(setCookie: string): PlaywrightCookie {
	const [nameValue, ...attrs] = setCookie.split(';').map((s) => s.trim());
	const eqIdx = nameValue.indexOf('=');
	const name = nameValue.slice(0, eqIdx);
	const value = nameValue.slice(eqIdx + 1);

	let path = '/';
	let httpOnly = false;
	let secure = false;
	let sameSite: 'Strict' | 'Lax' | 'None' = 'Lax';
	let expires = -1;

	for (const attr of attrs) {
		const [rawName, ...rawValueParts] = attr.split('=');
		const attrName = rawName.trim().toLowerCase();
		const attrValue = rawValueParts.join('=').trim();
		if (attrName === 'max-age') {
			const maxAge = parseInt(attrValue, 10);
			if (Number.isFinite(maxAge)) {
				expires = Math.floor(Date.now() / 1000) + maxAge;
			}
		} else if (attrName === 'expires') {
			const t = Date.parse(attrValue);
			if (!Number.isNaN(t)) expires = Math.floor(t / 1000);
		} else if (attrName === 'path') {
			path = attrValue || '/';
		} else if (attrName === 'httponly') {
			httpOnly = true;
		} else if (attrName === 'secure') {
			secure = true;
		} else if (attrName === 'samesite') {
			const v = attrValue.toLowerCase();
			sameSite = v === 'strict' ? 'Strict' : v === 'none' ? 'None' : 'Lax';
		}
	}

	// Tests visit different localhost ports across workers; cookies are not
	// scoped by port, so a domain of `localhost` matches every worker URL.
	return { name, value, domain: 'localhost', path, expires, httpOnly, secure, sameSite };
}
