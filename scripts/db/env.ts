import { execSync } from 'node:child_process';
import { confirm, text, log, intro, outro, isCancel } from '@clack/prompts';
import { config } from 'dotenv';

const args = process.argv.slice(2);
export const skipConfirm = args.includes('-y') || args.includes('--yes');

export function loadProdEnv() {
	config({ path: '.env.prod', quiet: true });
	if (!process.env.DATABASE_URL) {
		log.error('DATABASE_URL is not set. Add it to .env.prod.');
		process.exit(1);
	}
}

export function parseDatabaseUrl(): { host: string; dbName: string } {
	const url = new URL(process.env.DATABASE_URL!);
	return { host: url.hostname, dbName: url.pathname.slice(1) };
}

export async function confirmDestructiveDev(action: string) {
	if (skipConfirm) return;
	intro(`db:${action}`);
	const ok = await confirm({ message: 'Reset the dev database?' });
	if (isCancel(ok) || !ok) {
		outro('Aborted.');
		process.exit(0);
	}
}

export async function confirmDestructiveProd(action: string) {
	if (skipConfirm) return;
	intro(`db:${action}`);
	const { dbName } = parseDatabaseUrl();
	log.warn(`DATABASE_URL: ${process.env.DATABASE_URL}`);
	if (process.env.PROD_SSH_HOST) log.warn(`PROD_SSH_HOST: ${process.env.PROD_SSH_HOST}`);
	const answer = await text({ message: `Type "${dbName}" to confirm:` });
	if (isCancel(answer) || answer !== dbName) {
		outro('Aborted.');
		process.exit(0);
	}
}

export function exec(cmd: string) {
	execSync(cmd, { stdio: 'inherit', env: process.env });
}
