import { type CalendarDate, today } from '@internationalized/date';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { booking, timeslot, user } from '$lib/server/db/schema';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

export async function getTimeslotStartHour(timeslotId: number): Promise<number | null> {
	const [row] = await db
		.select({ startHour: timeslot.startHour })
		.from(timeslot)
		.where(eq(timeslot.id, timeslotId))
		.limit(1);
	return row?.startHour ?? null;
}

function maxBookingDate(from: CalendarDate = today(TIMEZONE)): CalendarDate {
	return from.add({ months: 1 });
}

export function validateBookingDate(date: CalendarDate): void {
	const now = today(TIMEZONE);
	if (date.compare(now) < 0) {
		throw new Error('Cannot book in the past');
	}
	if (date.compare(maxBookingDate(now)) > 0) {
		throw new Error('Cannot book more than one month in advance');
	}
}

export async function getBookingCalendar(resource: Resource) {
	const startDate = today(TIMEZONE).toString();
	const endDate = maxBookingDate().toString();

	return await db
		.select({
			timeslotId: timeslot.id,
			startHour: timeslot.startHour,
			endHour: timeslot.endHour,
			date: booking.date,
			bookingId: booking.id,
			userId: booking.userId,
			username: user.username
		})
		.from(timeslot)
		.leftJoin(
			booking,
			and(
				eq(booking.timeslotId, timeslot.id),
				eq(booking.resource, resource),
				gte(booking.date, startDate),
				lte(booking.date, endDate)
			)
		)
		.leftJoin(user, eq(booking.userId, user.id))
		.where(eq(timeslot.resource, resource))
		.orderBy(timeslot.startHour);
}

export async function hasExistingFutureBooking(
	userId: string,
	resource: Resource
): Promise<boolean> {
	const todayStr = today(TIMEZONE).toString();
	const result = await db
		.select({ id: booking.id })
		.from(booking)
		.where(
			and(eq(booking.userId, userId), eq(booking.resource, resource), gte(booking.date, todayStr))
		)
		.limit(1);
	return result.length > 0;
}

export async function createBooking(
	userId: string,
	timeslotId: number,
	resource: Resource,
	date: CalendarDate
) {
	return await db
		.insert(booking)
		.values({ userId, timeslotId, resource, date: date.toString() })
		.returning();
}

export async function cancelBooking(
	bookingId: number,
	userId: string
): Promise<{ resource: Resource; date: string; startHour: number } | null> {
	const todayStr = today(TIMEZONE).toString();
	const [info] = await db
		.select({
			resource: booking.resource,
			date: booking.date,
			startHour: timeslot.startHour
		})
		.from(booking)
		.innerJoin(timeslot, eq(booking.timeslotId, timeslot.id))
		.where(and(eq(booking.id, bookingId), eq(booking.userId, userId), gte(booking.date, todayStr)))
		.limit(1);
	if (!info) return null;
	const result = await db
		.delete(booking)
		.where(and(eq(booking.id, bookingId), eq(booking.userId, userId), gte(booking.date, todayStr)))
		.returning();
	if (result.length === 0) return null;
	return info;
}
