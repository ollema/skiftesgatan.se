import * as v from 'valibot';
import { username } from 'better-auth/plugins';

const APARTMENT_REGEX = /^[ABCD]1[0-3]0[12]$/;

export const apartmentSchema = v.pipe(
	v.string(),
	v.transform((u) => u.toUpperCase()),
	v.regex(APARTMENT_REGEX, 'Måste vara en giltig lägenhet (t.ex. A1001)')
);

export const PASSWORD_CONFIG = {
	minPasswordLength: 8,
	maxPasswordLength: 256
} as const;

export function usernamePlugin() {
	return username({
		minUsernameLength: 5,
		maxUsernameLength: 5,
		usernameNormalization: (u: string) => u.toUpperCase(),
		validationOrder: { username: 'post-normalization' as const },
		usernameValidator: (u: string) => APARTMENT_REGEX.test(u)
	});
}
