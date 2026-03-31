import * as v from 'valibot';
import { parseDate } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { requireAuth, getAuthUser } from '$lib/server/auth';
import {
	getAvailableSlots,
	getUpcomingBookings,
	hasExistingFutureBooking,
	createBooking as createBookingDb,
	cancelBooking as cancelBookingDb,
	validateBookingDate
} from '$lib/server/booking';

const resourceSchema = v.picklist(['laundry_room', 'outdoor_area']);
const dateSchema = v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/));

export const getSlots = query(
	v.object({ date: dateSchema, resource: resourceSchema }),
	async ({ date, resource }) => {
		const calDate = parseDate(date);
		validateBookingDate(calDate);
		const slots = await getAvailableSlots(calDate, resource);
		const user = getAuthUser();
		if (!user) return slots.map((s) => ({ ...s, username: null, userId: null }));
		return slots;
	}
);

export const getUpcomingSlots = query(
	v.object({ resource: resourceSchema }),
	async ({ resource }) => {
		const bookings = await getUpcomingBookings(resource);
		const user = getAuthUser();
		if (!user) return bookings.map((b) => ({ ...b, username: null, userId: null }));
		return bookings;
	}
);

export const book = command(
	v.object({
		timeslotId: v.number(),
		resource: resourceSchema,
		date: dateSchema,
		replaceBookingId: v.optional(v.number())
	}),
	async ({ timeslotId, resource, date, replaceBookingId }) => {
		const user = requireAuth();
		const calDate = parseDate(date);

		validateBookingDate(calDate);

		if (replaceBookingId !== undefined) {
			const cancelled = await cancelBookingDb(replaceBookingId, user.id);
			if (!cancelled) {
				error(404, 'Existing booking not found or cannot be cancelled');
			}
		} else {
			const alreadyBooked = await hasExistingFutureBooking(user.id, resource);
			if (alreadyBooked) {
				error(409, 'You already have a future booking for this resource');
			}
		}

		try {
			const [result] = await createBookingDb(user.id, timeslotId, resource, calDate);
			await getSlots({ date, resource }).refresh();
			await getUpcomingSlots({ resource }).refresh();
			return result;
		} catch (e: unknown) {
			if (e instanceof Error && 'code' in e && (e as { code: string }).code === '23505') {
				error(409, 'This slot is already booked');
			}
			throw e;
		}
	}
);

export const cancelBooking = command(v.object({ bookingId: v.number() }), async ({ bookingId }) => {
	const user = requireAuth();

	const success = await cancelBookingDb(bookingId, user.id);
	if (!success) {
		error(404, 'Booking not found or cannot be cancelled');
	}
});
