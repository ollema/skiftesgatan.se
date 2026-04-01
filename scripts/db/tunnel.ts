import { log } from '@clack/prompts';
import { config } from 'dotenv';
import { exec } from './env.js';

config({ path: '.env.prod', quiet: true });

const ssh = process.env.PROD_SSH_HOST;
const sshPort = process.env.PROD_SSH_PORT || '4646';

if (!ssh) {
	log.error('PROD_SSH_HOST is not set. Add it to .env.prod.');
	process.exit(1);
}

const cmd = `ssh -N -L 5432:srv-captain--skiftesgatan-prod-db:5432 ${ssh} -p ${sshPort}`;
log.info(`Opening tunnel: ${cmd}`);
log.info('Use DATABASE_URL from .env.prod to run prod commands in another terminal.');
log.info('Press Ctrl+C to close.');
exec(cmd);
