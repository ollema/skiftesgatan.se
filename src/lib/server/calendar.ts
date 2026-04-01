import { randomUUID } from 'crypto';
import { eq, and, gte } from 'drizzle-orm';
import { today } from '@internationalized/date';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { db } from '$lib/server/db';
import { booking, timeslot, calendarToken } from '$lib/server/db/schema';
import { TIMEZONE } from '$lib/types/bookings';

const RESOURCE_LABELS = {
	laundry_room: 'Tvättstuga',
	outdoor_area: 'Uteplats'
} as const;

export async function getOrCreateToken(userId: string): Promise<string> {
	const existing = await db
		.select({ token: calendarToken.token })
		.from(calendarToken)
		.where(eq(calendarToken.userId, userId))
		.limit(1);

	if (existing.length > 0) return existing[0].token;

	const token = randomUUID();
	await db.insert(calendarToken).values({ token, userId });
	return token;
}

export async function regenerateToken(userId: string): Promise<string> {
	await db.delete(calendarToken).where(eq(calendarToken.userId, userId));
	const token = randomUUID();
	await db.insert(calendarToken).values({ token, userId });
	return token;
}

export async function getUserIdByToken(token: string): Promise<string | null> {
	const result = await db
		.select({ userId: calendarToken.userId })
		.from(calendarToken)
		.where(eq(calendarToken.token, token))
		.limit(1);

	return result.length > 0 ? result[0].userId : null;
}

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

export async function generateCalendarFeed(userId: string): Promise<string> {
	const todayStr = today(TIMEZONE).toString();

	const bookings = await db
		.select({
			bookingId: booking.id,
			resource: booking.resource,
			date: booking.date,
			startHour: timeslot.startHour,
			endHour: timeslot.endHour
		})
		.from(booking)
		.innerJoin(timeslot, eq(booking.timeslotId, timeslot.id))
		.where(and(eq(booking.userId, userId), gte(booking.date, todayStr)));

	const cal = ical({
		name: 'Skiftesgatan - Bokningar',
		prodId: '//BRF Skiftesgatan 4//Bokningar//SV',
		method: ICalCalendarMethod.PUBLISH,
		timezone: TIMEZONE
	});

	for (const b of bookings) {
		const label = RESOURCE_LABELS[b.resource];
		const summary = `${label} ${pad(b.startHour)}:00–${pad(b.endHour)}:00`;

		cal.createEvent({
			id: `booking-${b.bookingId}@skiftesgatan.se`,
			summary,
			start: new Date(`${b.date}T${pad(b.startHour)}:00:00`),
			end: new Date(`${b.date}T${pad(b.endHour)}:00:00`),
			timezone: TIMEZONE,
			location: 'Skiftesgatan 4'
		});
	}

	return cal.toString();
}
