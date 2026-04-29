import * as v from 'valibot';
import { query, command } from '$app/server';
import { requireAuth } from '$lib/server/auth';
import { getReminderPreferences, setReminderPreference } from '$lib/server/reminder';
import { RESOURCES } from '$lib/types/bookings';
import { touchUserActivity } from '$lib/server/activity';

export const getPreferences = query(async () => {
	const user = requireAuth();
	return getReminderPreferences(user.id);
});

export const togglePreference = command(
	v.object({
		resource: v.picklist(RESOURCES),
		offsetMinutes: v.picklist([60, 1440]),
		enabled: v.boolean()
	}),
	async ({ resource, offsetMinutes, enabled }) => {
		const user = requireAuth();
		await setReminderPreference(user.id, resource, offsetMinutes, enabled);
		await touchUserActivity(user.id);
	}
);
