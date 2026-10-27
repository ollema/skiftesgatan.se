import { defineEnvVars } from '@sveltejs/kit/env';

/**
 * Missing values fall back to `''` rather than failing when the module loads,
 * so development, builds, and tests can run with a partial `.env`. Production
 * startup enforces the required subset in `validateEnv()` (`#lib/server/env.js`).
 */
const optional = (input: string | undefined) => input ?? '';

export const variables = defineEnvVars({
	ORIGIN: { schema: optional },
	BETTER_AUTH_SECRET: { schema: optional },
	LOG_LEVEL: { schema: optional },
	RESEND_API_KEY: { schema: optional },
	EMAIL_FROM: { schema: optional },
	RATE_LIMIT_DISABLED: { schema: optional },
	PGLITE_PATH: { schema: optional },
	DATABASE_URL: { schema: optional },
	CONTACT_MANAGER_NAME: { schema: optional },
	CONTACT_MANAGER_PHONE: { schema: optional },
	CONTACT_MANAGER_EMAIL: { schema: optional },
	CONTACT_EMERGENCY_NAME: { schema: optional },
	CONTACT_EMERGENCY_PHONE: { schema: optional },
	CONTACT_EMERGENCY_DESC: { schema: optional },
	SKIP_ENV_VALIDATION: { schema: optional }
});
