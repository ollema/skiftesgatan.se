import { execSync } from 'child_process';
import { log } from '@clack/prompts';

const SSH_HOST = 'caprover@ssh.server.ollema.xyz';
const SSH_PORT = '4646';

const cmd = `ssh -N -L 5432:srv-captain--skiftesgatan-db-prod:5432 ${SSH_HOST} -p ${SSH_PORT}`;
log.info(`Opening tunnel: ${cmd}`);
log.info('Override DATABASE_URL inline in another terminal to run prod commands.');
log.info('Press Ctrl+C to close.');
execSync(cmd, { stdio: 'inherit', env: process.env });
