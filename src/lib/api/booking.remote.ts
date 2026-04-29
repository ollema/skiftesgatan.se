import * as v from 'valibot';
import { CalendarDate, Time, now } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command, requested } from '$app/server';
import { requireAuth, getAuthUser } from '$lib/server/auth';
import { log } from '$lib/server/log';
import {
	getBookingCalendar,
	getTimeBlockStartHour,
	bookSlot,
	buildBookingPayload,
	cancelBooking as cancelBookingDb,
	validateBookingDate
} from '$lib/server/booking';
import { createBookingNotifications } from '$lib/server/notification';
import { touchUserActivity } from '$lib/server/activity';
import { TIMEZONE, RESOURCES } from '$lib/types/bookings';

const resourceSchema = v.picklist(RESOURCES);
const calendarDateSchema = v.instance(CalendarDate);

const VALIDATE_DATE_MESSAGES = {
	past: 'Du kan inte boka tider som har varit',
	too_far: 'Du kan inte boka mer än en månad i förväg'
} as const;

export const getBookingData = query(
	v.object({
		resource: resourceSchema
	}),
	async ({ resource }) => {
		const rawRows = await getBookingCalendar(resource);
		const user = getAuthUser();
		const zdt = now(TIMEZONE);
		const fetchedAt = new Time(zdt.hour, zdt.minute, zdt.second);

		const { bookingCalendar, activeBooking } = buildBookingPayload(rawRows, user, zdt);

		return { bookingCalendar, activeBooking, fetchedAt };
	}
);

export const book = command(
	v.object({
		timeBlockId: v.number(),
		resource: resourceSchema,
		date: calendarDateSchema,
		replaceBookingId: v.optional(v.number())
	}),
	async ({ timeBlockId, resource, date, replaceBookingId }) => {
		const user = requireAuth();

		const dateError = validateBookingDate(date);
		if (dateError) error(400, VALIDATE_DATE_MESSAGES[dateError]);

		const startHour = await getTimeBlockStartHour(timeBlockId);

		const result = await bookSlot({
			userId: user.id,
			timeBlockId,
			resource,
			date,
			replaceBookingId,
			now: now(TIMEZONE)
		});

		if (result.kind === 'replace_not_found') error(404, 'Befintlig bokning hittades inte');
		if (result.kind === 'already_booked') error(409, 'Du har redan en kommande bokning');
		if (result.kind === 'slot_taken') {
			log.warn(
				`[booking] conflict username=${user.username} resource=${resource} date=${date} startHour=${startHour}`
			);
			error(409, 'Tiden är redan bokad');
		}

		if (result.cancelled) {
			log.info(
				`[booking] cancelled username=${user.username} resource=${result.cancelled.resource} date=${result.cancelled.date} startHour=${result.cancelled.startHour}`
			);
		}
		log.info(
			`[booking] created username=${user.username} resource=${resource} date=${date} startHour=${startHour}`
		);

		try {
			await createBookingNotifications(
				result.booking.id,
				user.id,
				resource,
				date.toString(),
				timeBlockId
			);
		} catch (e) {
			log.warn(
				`[notification] failed to create notifications username=${user.username} resource=${resource} date=${date} startHour=${startHour}: ${e}`
			);
		}

		await touchUserActivity(user.id);

		await getBookingData({ resource }).refresh();
		return result.booking;
	}
);

export const cancelBooking = command(v.object({ bookingId: v.number() }), async ({ bookingId }) => {
	const user = requireAuth();

	const result = await cancelBookingDb(bookingId, user.id, now(TIMEZONE));
	if (!result) {
		error(404, 'Bokningen hittades inte');
	}
	log.info(
		`[booking] cancelled username=${user.username} resource=${result.resource} date=${result.date} startHour=${result.startHour}`
	);

	await touchUserActivity(user.id);

	await requested(getBookingData, 5).refreshAll();
});
