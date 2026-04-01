import { now } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { eq, and, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { log } from '$lib/server/log';
import { sendEmail } from '$lib/server/email';
import { bookingNotification } from '$lib/server/db/notification.schema';
import { booking, timeslot } from '$lib/server/db/booking.schema';
import { user } from '$lib/server/db/auth.schema';
import { buildNotificationEmail } from '$lib/server/notification.email';

export async function processNotifications(): Promise<number> {
	const currentTime = now(TIMEZONE).toDate();

	const due = await db
		.select({
			id: bookingNotification.id,
			email: user.email,
			resource: booking.resource,
			date: booking.date,
			startHour: timeslot.startHour,
			endHour: timeslot.endHour
		})
		.from(bookingNotification)
		.innerJoin(user, eq(bookingNotification.userId, user.id))
		.innerJoin(booking, eq(bookingNotification.bookingId, booking.id))
		.innerJoin(timeslot, eq(booking.timeslotId, timeslot.id))
		.where(
			and(eq(bookingNotification.status, 'pending'), lte(bookingNotification.notifyAt, currentTime))
		)
		.orderBy(bookingNotification.notifyAt)
		.limit(50);

	for (const notification of due) {
		const { subject, html } = buildNotificationEmail({
			resource: notification.resource,
			date: notification.date,
			startHour: notification.startHour,
			endHour: notification.endHour
		});

		try {
			const resendId = await sendEmail({ to: notification.email, subject, html });
			await db
				.update(bookingNotification)
				.set({ status: 'sent', sentAt: currentTime, resendId })
				.where(eq(bookingNotification.id, notification.id));
			log.info(`[scheduler] sent notification id=${notification.id} to=${notification.email}`);
		} catch (e) {
			const failReason = e instanceof Error ? e.message : String(e);
			await db
				.update(bookingNotification)
				.set({ status: 'failed', failReason })
				.where(eq(bookingNotification.id, notification.id));
			log.error(`[scheduler] failed notification id=${notification.id}: ${failReason}`);
		}
	}

	return due.length;
}

export function startScheduler(): void {
	log.info('[scheduler] notification scheduler started (interval: 60s)');

	processNotifications().catch((e) => {
		log.error('[scheduler] initial run failed', e);
	});

	setInterval(async () => {
		try {
			await processNotifications();
		} catch (e) {
			log.error('[scheduler] unexpected error', e);
		}
	}, 60_000);
}
