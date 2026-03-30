import * as v from 'valibot';
import { parseDate } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command } from '$app/server';
import { requireAuth } from '$lib/server/auth';
import {
	getAvailableSlots,
	hasExistingFutureBooking,
	getOrCreateApartment,
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
		return await getAvailableSlots(calDate, resource);
	}
);

export const book = command(
	v.object({
		timeslotId: v.number(),
		resource: resourceSchema,
		date: dateSchema
	}),
	async ({ timeslotId, resource, date }) => {
		const user = requireAuth();
		const apartmentId = await getOrCreateApartment(user.id);
		const calDate = parseDate(date);

		validateBookingDate(calDate);

		const alreadyBooked = await hasExistingFutureBooking(apartmentId, resource);
		if (alreadyBooked) {
			error(409, 'You already have a future booking for this resource');
		}

		try {
			const [result] = await createBookingDb(apartmentId, timeslotId, resource, calDate);
			await getSlots({ date, resource }).refresh();
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
	const apartmentId = await getOrCreateApartment(user.id);

	const success = await cancelBookingDb(bookingId, apartmentId);
	if (!success) {
		error(404, 'Booking not found or cannot be cancelled');
	}
});
