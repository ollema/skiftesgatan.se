import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

// Load .env.prod into process.env (don't override existing vars)
try {
	const content = readFileSync('.env.prod', 'utf-8');
	for (const line of content.split('\n')) {
		const match = line.match(/^\s*([^#=\s]+)\s*=\s*["']?(.*?)["']?\s*$/);
		if (match && !process.env[match[1]]) {
			process.env[match[1]] = match[2];
		}
	}
} catch {
	// .env.prod is optional if env vars are set another way
}

const COMMANDS: Record<string, { cmd: string; destructive: boolean }> = {
	push: { cmd: 'pnpm exec drizzle-kit push', destructive: true },
	migrate: { cmd: 'pnpm exec drizzle-kit migrate', destructive: true },
	studio: { cmd: 'pnpm exec drizzle-kit studio', destructive: false },
	'seed:timeslots': {
		cmd: 'pnpx tsx src/lib/server/db/seed/timeslots.ts',
		destructive: true
	},
	'seed:accounts': {
		cmd: `pnpx tsx src/lib/server/db/seed/prod_accounts.ts ${process.argv.slice(3).join(' ')}`,
		destructive: true
	}
};

async function confirm(prompt: string): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(prompt, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
}

async function tunnel() {
	const ssh = process.env.PROD_VPS_SSH;
	const dbPort = process.env.PROD_VPS_DB_PORT || '5432';

	if (!ssh) {
		console.error('PROD_VPS_SSH is not set.');
		console.error(
			'Add it to .env.prod or pass it inline: PROD_VPS_SSH=root@your-vps pnpm db:prod tunnel'
		);
		process.exit(1);
	}

	const cmd = `ssh -N -L 5433:localhost:${dbPort} ${ssh}`;
	console.log(`Opening tunnel: ${cmd}`);
	console.log(
		'Tunnel is open. Use DATABASE_URL from .env.prod to run prod commands in another terminal.'
	);
	console.log('Press Ctrl+C to close.\n');
	execSync(cmd, { stdio: 'inherit' });
}

async function run(subcommand: string) {
	const entry = COMMANDS[subcommand];
	if (!entry) {
		console.error(`Unknown command: ${subcommand}`);
		console.error(`Available: tunnel, ${Object.keys(COMMANDS).join(', ')}`);
		process.exit(1);
	}

	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error('DATABASE_URL is not set.');
		console.error('Add it to .env.prod or pass it inline.');
		console.error('Did you mean to use db:dev:* instead?');
		process.exit(1);
	}

	let host: string;
	let dbName: string;
	try {
		const url = new URL(dbUrl);
		host = url.hostname;
		dbName = url.pathname.slice(1);
	} catch {
		console.error(`Invalid DATABASE_URL: ${dbUrl}`);
		process.exit(1);
	}

	console.log(`\nTarget: ${host} / ${dbName}`);

	if (entry.destructive) {
		const answer = await confirm(`This is a DESTRUCTIVE operation. Type "${dbName}" to confirm: `);
		if (answer !== dbName) {
			console.log('Aborted.');
			process.exit(1);
		}
	}

	console.log(`Running: ${entry.cmd}\n`);
	execSync(entry.cmd, { stdio: 'inherit', env: process.env });
}

async function main() {
	const subcommand = process.argv[2];

	if (!subcommand) {
		console.error('Usage: pnpm db:prod <command>');
		console.error(`Commands: tunnel, ${Object.keys(COMMANDS).join(', ')}`);
		process.exit(1);
	}

	if (subcommand === 'tunnel') {
		await tunnel();
	} else {
		await run(subcommand);
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
