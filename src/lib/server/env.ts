import { dev, building } from '$app/environment';
import { env } from '$env/dynamic/private';

const REQUIRED_IN_PRODUCTION = [
	'ORIGIN',
	'BETTER_AUTH_SECRET',
	'EMAIL_FROM',
	'RESEND_API_KEY',
	'CONTACT_MANAGER_NAME',
	'CONTACT_MANAGER_PHONE',
	'CONTACT_MANAGER_EMAIL'
] as const;

export function validateEnv() {
	if (dev || building) return;
	if (env.SKIP_ENV_VALIDATION) return;

	const missing = REQUIRED_IN_PRODUCTION.filter((name) => !env[name]);
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}. ` +
				`See README.md for the full list.`
		);
	}
}
