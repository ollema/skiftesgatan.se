import { now } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { eq, and, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { log } from '$lib/server/log';
import { slotPhrase } from '$lib/server/log.prose';
import { sendEmail } from '$lib/server/email';
import { EMAIL_TEMPLATES } from '$lib/server/email.templates';
import { bookingReminder } from '$lib/server/db/reminder.schema';
import { booking } from '$lib/server/db/booking.schema';
import { user } from '$lib/server/db/auth.schema';
import { getTimeBlockHours } from '$lib/server/booking';
import { buildBookingReminderVariables } from '$lib/server/reminder.email';

export async function processReminders(): Promise<number> {
	const currentTime = now(TIMEZONE).toDate();

	const due = await db
		.select({
			id: bookingReminder.id,
			email: user.email,
			username: user.username,
			resource: booking.resource,
			date: booking.date,
			timeBlockId: booking.timeBlockId
		})
		.from(bookingReminder)
		.innerJoin(user, eq(bookingReminder.userId, user.id))
		.innerJoin(booking, eq(bookingReminder.bookingId, booking.id))
		.where(and(eq(bookingReminder.status, 'pending'), lte(bookingReminder.notifyAt, currentTime)))
		.orderBy(bookingReminder.notifyAt)
		.limit(50);

	for (const reminder of due) {
		const { startHour, endHour } = await getTimeBlockHours(reminder.timeBlockId);
		const variables = buildBookingReminderVariables({
			resource: reminder.resource,
			date: reminder.date,
			startHour,
			endHour
		});

		try {
			const resendId = await sendEmail({
				to: reminder.email,
				templateAlias: EMAIL_TEMPLATES.bookingReminder.alias,
				variables
			});
			await db
				.update(bookingReminder)
				.set({ status: 'sent', sentAt: currentTime, resendId })
				.where(eq(bookingReminder.id, reminder.id));
			log.info(
				`[scheduler] sent reminder to apartment ${reminder.username} for ${slotPhrase(reminder.resource, reminder.date, startHour, endHour)}`
			);
		} catch (e) {
			const failReason = e instanceof Error ? e.message : String(e);
			await db
				.update(bookingReminder)
				.set({ status: 'failed', failReason })
				.where(eq(bookingReminder.id, reminder.id));
			log.error(
				`[scheduler] failed to send reminder to apartment ${reminder.username} for ${slotPhrase(reminder.resource, reminder.date, startHour, endHour)}: ${failReason}`
			);
		}
	}

	return due.length;
}

export function startScheduler(): void {
	log.info('[scheduler] started (interval 60s)');

	processReminders().catch((e) => {
		log.error('[scheduler] initial run failed', e);
	});

	setInterval(async () => {
		try {
			await processReminders();
		} catch (e) {
			log.error('[scheduler] unexpected error', e);
		}
	}, 60_000);
}
