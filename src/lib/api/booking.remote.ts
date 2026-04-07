import * as v from 'valibot';
import { CalendarDate, CalendarDateTime, Time, now, parseDate } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command, requested } from '$app/server';
import { requireAuth, getAuthUser } from '$lib/server/auth';
import { log } from '$lib/server/log';
import {
	getAvailableSlots,
	getUpcomingBookings,
	hasExistingFutureBooking,
	createBooking as createBookingDb,
	cancelBooking as cancelBookingDb,
	validateBookingDate
} from '$lib/server/booking';
import { createBookingNotifications } from '$lib/server/notification';
import { TIMEZONE, RESOURCES, type Slot, type UpcomingBooking } from '$lib/types/bookings';

const resourceSchema = v.picklist(RESOURCES);
const calendarDateSchema = v.instance(CalendarDate);

function toCalendarDateTime(date: CalendarDate, hour: number) {
	return new CalendarDateTime(date.year, date.month, date.day, hour);
}

export const getSlots = query(
	v.object({ date: calendarDateSchema, resource: resourceSchema }),
	async ({ date, resource }) => {
		const rawSlots = await getAvailableSlots(date, resource);
		const user = getAuthUser();
		const zdt = now(TIMEZONE);
		const fetchedAt = new Time(zdt.hour, zdt.minute, zdt.second);
		const slots: Slot[] = rawSlots.map((s) => ({
			id: s.id,
			start: toCalendarDateTime(date, s.startHour),
			end: toCalendarDateTime(date, s.endHour),
			bookingId: s.bookingId,
			userId: user ? s.userId : null,
			username: user ? s.username : null
		}));
		return { slots, fetchedAt };
	}
);

export const getUpcomingSlots = query(
	v.object({ resource: resourceSchema }),
	async ({ resource }) => {
		const rawBookings = await getUpcomingBookings(resource);
		const user = getAuthUser();
		const bookings: UpcomingBooking[] = rawBookings.map((b) => {
			const date = parseDate(b.date);
			return {
				timeslotId: b.timeslotId,
				start: toCalendarDateTime(date, b.startHour),
				end: toCalendarDateTime(date, b.endHour),
				bookingId: b.bookingId,
				userId: user ? b.userId : null,
				username: user ? b.username : null
			};
		});
		return bookings;
	}
);

export const book = command(
	v.object({
		timeslotId: v.number(),
		resource: resourceSchema,
		date: calendarDateSchema,
		replaceBookingId: v.optional(v.number())
	}),
	async ({ timeslotId, resource, date, replaceBookingId }) => {
		const user = requireAuth();

		validateBookingDate(date);

		if (replaceBookingId !== undefined) {
			const cancelled = await cancelBookingDb(replaceBookingId, user.id);
			if (!cancelled) {
				error(404, 'Befintlig bokning hittades inte');
			}
		} else {
			const alreadyBooked = await hasExistingFutureBooking(user.id, resource);
			if (alreadyBooked) {
				error(409, 'Du har redan en kommande bokning');
			}
		}

		try {
			const [result] = await createBookingDb(user.id, timeslotId, resource, date);
			try {
				await createBookingNotifications(result.id, user.id, resource, date.toString(), timeslotId);
			} catch (e) {
				log.warn(`[notification] failed to create notifications bookingId=${result.id}: ${e}`);
			}
			await getSlots({ date, resource }).refresh();
			await getUpcomingSlots({ resource }).refresh();
			return result;
		} catch (e: unknown) {
			if (e instanceof Error && 'code' in e && (e as { code: string }).code === '23505') {
				log.warn(
					`[booking] conflict userId=${user.id} resource=${resource} date=${date} timeslotId=${timeslotId}`
				);
				error(409, 'Tiden är redan bokad');
			}
			throw e;
		}
	}
);

export const cancelBooking = command(v.object({ bookingId: v.number() }), async ({ bookingId }) => {
	const user = requireAuth();

	const success = await cancelBookingDb(bookingId, user.id);
	if (!success) {
		error(404, 'Bokningen hittades inte');
	}

	await requested(getSlots, 5).refreshAll();
	await requested(getUpcomingSlots, 5).refreshAll();
});
