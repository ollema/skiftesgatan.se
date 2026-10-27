import { dev, building } from '$app/env';
import {
	BETTER_AUTH_SECRET,
	CONTACT_MANAGER_EMAIL,
	CONTACT_MANAGER_NAME,
	CONTACT_MANAGER_PHONE,
	DATABASE_URL,
	EMAIL_FROM,
	ORIGIN,
	RESEND_API_KEY,
	SKIP_ENV_VALIDATION
} from '$app/env/private';

const REQUIRED_IN_PRODUCTION = {
	DATABASE_URL,
	ORIGIN,
	BETTER_AUTH_SECRET,
	EMAIL_FROM,
	RESEND_API_KEY,
	CONTACT_MANAGER_NAME,
	CONTACT_MANAGER_PHONE,
	CONTACT_MANAGER_EMAIL
} as const;

export function validateEnv() {
	if (dev || building) return;
	if (SKIP_ENV_VALIDATION) return;

	const missing = Object.entries(REQUIRED_IN_PRODUCTION)
		.filter(([, value]) => !value)
		.map(([name]) => name);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}. ` +
				`See README.md for the full list.`
		);
	}
}
