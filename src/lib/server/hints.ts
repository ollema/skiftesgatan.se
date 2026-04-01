import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notificationPreference } from '$lib/server/db/notification.schema';
import { calendarToken } from '$lib/server/db/calendar.schema';

export async function getSetupStatus(userId: string) {
	const prefs = await db
		.select({ enabled: notificationPreference.enabled })
		.from(notificationPreference)
		.where(eq(notificationPreference.userId, userId));

	const hasNotifications = prefs.some((p) => p.enabled);

	const tokens = await db
		.select({ token: calendarToken.token })
		.from(calendarToken)
		.where(eq(calendarToken.userId, userId))
		.limit(1);

	const hasCalendarToken = tokens.length > 0;

	return { hasNotifications, hasCalendarToken };
}
