import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { eq, and, gte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apartment, booking, timeslot } from '$lib/server/db/schema';

const MAX_ADVANCE_DAYS = 30;

export type Resource = 'laundry_room' | 'outdoor_area';

export function validateBookingDate(date: CalendarDate): void {
	const now = today(getLocalTimeZone());
	if (date.compare(now) < 0) {
		throw new Error('Cannot book in the past');
	}
	const max = now.add({ days: MAX_ADVANCE_DAYS });
	if (date.compare(max) > 0) {
		throw new Error(`Cannot book more than ${MAX_ADVANCE_DAYS} days in advance`);
	}
}

export async function getAvailableSlots(date: CalendarDate, resource: Resource) {
	const dateStr = date.toString();
	return await db
		.select({
			id: timeslot.id,
			startHour: timeslot.startHour,
			endHour: timeslot.endHour,
			bookingId: booking.id,
			apartmentId: booking.apartmentId
		})
		.from(timeslot)
		.leftJoin(
			booking,
			and(
				eq(booking.timeslotId, timeslot.id),
				eq(booking.date, dateStr),
				eq(booking.resource, resource)
			)
		)
		.where(eq(timeslot.resource, resource))
		.orderBy(timeslot.startHour);
}

export async function hasExistingFutureBooking(
	apartmentId: number,
	resource: Resource
): Promise<boolean> {
	const todayStr = today(getLocalTimeZone()).toString();
	const result = await db
		.select({ id: booking.id })
		.from(booking)
		.where(
			and(
				eq(booking.apartmentId, apartmentId),
				eq(booking.resource, resource),
				gte(booking.date, todayStr)
			)
		)
		.limit(1);
	return result.length > 0;
}

export async function getOrCreateApartment(userId: string): Promise<number> {
	const existing = await db
		.select({ id: apartment.id })
		.from(apartment)
		.where(eq(apartment.userId, userId))
		.limit(1);

	if (existing.length > 0) {
		return existing[0].id;
	}

	const [created] = await db.insert(apartment).values({ userId }).returning();
	return created.id;
}

export async function createBooking(
	apartmentId: number,
	timeslotId: number,
	resource: Resource,
	date: CalendarDate
) {
	return await db
		.insert(booking)
		.values({ apartmentId, timeslotId, resource, date: date.toString() })
		.returning();
}

export async function cancelBooking(bookingId: number, apartmentId: number): Promise<boolean> {
	const todayStr = today(getLocalTimeZone()).toString();
	const result = await db
		.delete(booking)
		.where(
			and(
				eq(booking.id, bookingId),
				eq(booking.apartmentId, apartmentId),
				gte(booking.date, todayStr)
			)
		)
		.returning();
	return result.length > 0;
}
