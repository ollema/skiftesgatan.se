import { username } from 'better-auth/plugins';

export const APARTMENTS: string[] = [];
for (const block of ['A', 'B', 'C', 'D']) {
	for (const floor of [0, 1, 2, 3]) {
		for (const door of [1, 2]) {
			APARTMENTS.push(`${block}1${floor}0${door}`);
		}
	}
}

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
		usernameValidator: (u: string) => /^[ABCD]1[0-3]0[12]$/.test(u)
	});
}
