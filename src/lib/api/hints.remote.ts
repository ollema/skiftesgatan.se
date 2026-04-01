import { getRequestEvent, query } from '$app/server';
import { getAuthUser } from '$lib/server/auth';
import { getSetupStatus } from '$lib/server/hints';

export const getSetupHints = query(async () => {
	const user = getAuthUser();
	if (!user) return { showNotificationHint: false, showCalendarHint: false };

	const { cookies } = getRequestEvent();
	const dismissedNotifications = cookies.get('dismiss_hint_notifications');
	const dismissedCalendar = cookies.get('dismiss_hint_calendar');

	if (dismissedNotifications && dismissedCalendar) {
		return { showNotificationHint: false, showCalendarHint: false };
	}

	const { hasNotifications, hasCalendarToken } = await getSetupStatus(user.id);

	return {
		showNotificationHint: !hasNotifications && !dismissedNotifications,
		showCalendarHint: !hasCalendarToken && !dismissedCalendar
	};
});
