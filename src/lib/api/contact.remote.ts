import { query } from '$app/server';
import { env } from '$env/dynamic/private';
import { getAuthUser } from '$lib/server/auth';

export const getContactInfo = query(() => {
	const user = getAuthUser();
	if (!user) return null;

	return {
		manager: {
			name: env.CONTACT_MANAGER_NAME ?? '',
			phone: env.CONTACT_MANAGER_PHONE ?? '',
			email: env.CONTACT_MANAGER_EMAIL ?? ''
		},
		emergency: {
			name: env.CONTACT_EMERGENCY_NAME ?? '',
			phone: env.CONTACT_EMERGENCY_PHONE ?? '',
			description: env.CONTACT_EMERGENCY_DESC ?? ''
		}
	};
});
