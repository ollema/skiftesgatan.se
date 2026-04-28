import { execSync } from 'node:child_process';
import { confirm, log, intro, outro, isCancel } from '@clack/prompts';

const args = process.argv.slice(2);
export const skipConfirm = args.includes('-y') || args.includes('--yes');

export async function confirmReset() {
	if (skipConfirm) return;
	intro('db:reset');
	log.warn(`DATABASE_URL: ${process.env.DATABASE_URL}`);
	const ok = await confirm({ message: 'Reset this database? (drops all data)' });
	if (isCancel(ok) || !ok) {
		outro('Aborted.');
		process.exit(0);
	}
}

export function exec(cmd: string) {
	execSync(cmd, { stdio: 'inherit', env: process.env });
}
