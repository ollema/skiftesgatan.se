import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { reminderPreference } from '$lib/server/db/reminder.schema';
import { calendarToken } from '$lib/server/db/calendar.schema';

export async function getSetupStatus(userId: string) {
	const prefs = await db
		.select({ enabled: reminderPreference.enabled })
		.from(reminderPreference)
		.where(eq(reminderPreference.userId, userId));

	const hasReminders = prefs.some((p) => p.enabled);

	const tokens = await db
		.select({ token: calendarToken.token })
		.from(calendarToken)
		.where(eq(calendarToken.userId, userId))
		.limit(1);

	const hasCalendarToken = tokens.length > 0;

	return { hasReminders, hasCalendarToken };
}
