import * as v from 'valibot';
import { CalendarDate, now } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { requireAuth, getAuthUser } from '$lib/server/auth';
import { log } from '$lib/server/log';
import { slotPhrase, slotTimeRange } from '$lib/server/log.prose';
import {
	getBookingCalendar,
	bookSlot,
	buildBookingPayload,
	cancelBooking as cancelBookingDb,
	validateBookingDate
} from '$lib/server/booking';
import { bookingEvents } from '$lib/server/booking-events';
import { createBookingReminders } from '$lib/server/reminder';
import { TIMEZONE, RESOURCES } from '$lib/types/bookings';

const resourceSchema = v.picklist(RESOURCES);
const calendarDateSchema = v.instance(CalendarDate);

const VALIDATE_DATE_MESSAGES = {
	past: 'Du kan inte boka tider som har varit',
	too_far: 'Du kan inte boka mer än en månad i förväg'
} as const;

export const getBookingData = query.live(
	v.object({
		resource: resourceSchema
	}),
	async function* ({ resource }) {
		const user = getAuthUser();

		const buildPayload = async () => {
			const rawRows = await getBookingCalendar(resource);
			return buildBookingPayload(rawRows, user, now(TIMEZONE));
		};

		let pending = false;
		let wake: (() => void) | undefined;

		const unsubscribe = bookingEvents.subscribe(resource, () => {
			pending = true;
			wake?.();
			wake = undefined;
		});

		try {
			yield await buildPayload();

			while (true) {
				if (!pending) {
					await new Promise<void>((resolve) => {
						wake = resolve;
					});
				}
				pending = false;
				yield await buildPayload();
			}
		} finally {
			unsubscribe();
		}
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
				`[booking] apartment ${user.username} tried to book ${slotPhrase(resource, date.toString(), result.startHour, result.endHour)} but the slot was already taken`
			);
			error(409, 'Tiden är redan bokad');
		}

		const newSlot = slotPhrase(resource, date.toString(), result.startHour, result.endHour);
		if (result.cancelled) {
			const fromRange = slotTimeRange(
				result.cancelled.date,
				result.cancelled.startHour,
				result.cancelled.endHour
			);
			const toRange = slotTimeRange(date.toString(), result.startHour, result.endHour);
			log.info(
				`[booking] apartment ${user.username} moved their ${resource} booking from ${fromRange} to ${toRange}`
			);
		} else {
			log.info(`[booking] apartment ${user.username} booked ${newSlot}`);
		}

		try {
			const count = await createBookingReminders(
				result.booking.id,
				user.id,
				resource,
				date.toString(),
				timeBlockId
			);
			if (count > 0) {
				log.info(
					`[reminder] scheduled ${count} reminder(s) for apartment ${user.username} ahead of ${newSlot}`
				);
			}
		} catch (e) {
			log.warn(
				`[reminder] failed to schedule reminders for apartment ${user.username} ahead of ${newSlot}: ${e}`
			);
		}

		bookingEvents.emit(resource);
		getBookingData({ resource }).reconnect();
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
		`[booking] apartment ${user.username} cancelled their booking of ${slotPhrase(result.resource, result.date, result.startHour, result.endHour)}`
	);

	bookingEvents.emit(result.resource);
	getBookingData({ resource: result.resource }).reconnect();
});
