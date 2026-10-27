import { query } from '$app/server';

import {
	CONTACT_MANAGER_NAME,
	CONTACT_MANAGER_PHONE,
	CONTACT_MANAGER_EMAIL,
	CONTACT_EMERGENCY_NAME,
	CONTACT_EMERGENCY_PHONE,
	CONTACT_EMERGENCY_DESC
} from '$app/env/private';

import { getAuthUser } from '#lib/server/auth.js';

export const getContactInfo = query(() => {
	const user = getAuthUser();
	if (!user) return null;

	return {
		manager: {
			name: CONTACT_MANAGER_NAME ?? '',
			phone: CONTACT_MANAGER_PHONE ?? '',
			email: CONTACT_MANAGER_EMAIL ?? ''
		},
		emergency: {
			name: CONTACT_EMERGENCY_NAME ?? '',
			phone: CONTACT_EMERGENCY_PHONE ?? '',
			description: CONTACT_EMERGENCY_DESC ?? ''
		}
	};
});
