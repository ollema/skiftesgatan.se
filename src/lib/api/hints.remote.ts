import { getRequestEvent, query } from '$app/server';
import { getAuthUser } from '$lib/server/auth';
import { getSetupStatus } from '$lib/server/hints';

export const getSetupHints = query(async () => {
	const user = getAuthUser();
	if (!user) return { showReminderHint: false, showCalendarHint: false };

	const { cookies } = getRequestEvent();
	const dismissedReminders = cookies.get('dismiss_hint_reminders');
	const dismissedCalendar = cookies.get('dismiss_hint_calendar');

	if (dismissedReminders && dismissedCalendar) {
		return { showReminderHint: false, showCalendarHint: false };
	}

	const { hasReminders, hasCalendarToken } = await getSetupStatus(user.id);

	return {
		showReminderHint: !hasReminders && !dismissedReminders,
		showCalendarHint: !hasCalendarToken && !dismissedCalendar
	};
});
