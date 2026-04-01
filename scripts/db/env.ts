import { execSync } from 'node:child_process';
import { confirm, text, log, intro, outro, isCancel } from '@clack/prompts';
import { config } from 'dotenv';

export type DbEnv = 'test' | 'dev' | 'prod';

const args = process.argv.slice(2);
export const skipConfirm = args.includes('-y') || args.includes('--yes');
export const dropFlag = args.includes('--drop');

export function parseEnv(allowed: DbEnv[] = ['test', 'dev', 'prod']): DbEnv {
	const env = args.find((a) => !a.startsWith('-')) as DbEnv;
	if (!allowed.includes(env)) {
		console.error(`Usage: ${process.argv[1].split('/').pop()} <${allowed.join('|')}> [-y]`);
		process.exit(1);
	}
	return env;
}

export function setEnvVars(env: DbEnv) {
	switch (env) {
		case 'test':
			delete process.env.DATABASE_URL;
			process.env.PGLITE_PATH = '.pglite-test';
			break;
		case 'dev':
			delete process.env.DATABASE_URL;
			delete process.env.PGLITE_PATH;
			break;
		case 'prod':
			config({ path: '.env.prod', quiet: true });
			if (!process.env.DATABASE_URL) {
				log.error('DATABASE_URL is not set. Add it to .env.prod.');
				process.exit(1);
			}
			break;
	}
}

export function parseDatabaseUrl(): { host: string; dbName: string } {
	const url = new URL(process.env.DATABASE_URL!);
	return { host: url.hostname, dbName: url.pathname.slice(1) };
}

export async function confirmDestructive(env: DbEnv, action: string) {
	if (env === 'test' || skipConfirm) return;

	intro(`db:${action}`);

	if (env === 'dev') {
		const ok = await confirm({ message: 'Reset the dev database?' });
		if (isCancel(ok) || !ok) {
			outro('Aborted.');
			process.exit(0);
		}
		return;
	}

	const { dbName } = parseDatabaseUrl();
	log.warn(`DATABASE_URL: ${process.env.DATABASE_URL}`);
	if (process.env.PROD_SSH_HOST) {
		log.warn(`PROD_SSH_HOST: ${process.env.PROD_SSH_HOST}`);
	}

	const answer = await text({ message: `Type "${dbName}" to confirm:` });
	if (isCancel(answer) || answer !== dbName) {
		outro('Aborted.');
		process.exit(0);
	}
}

export function exec(cmd: string) {
	execSync(cmd, { stdio: 'inherit', env: process.env });
}
