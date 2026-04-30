import { randomUUID } from 'crypto';
import { eq, and, gte } from 'drizzle-orm';
import type { ZonedDateTime } from '@internationalized/date';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { db } from '$lib/server/db';
import { booking, calendarToken } from '$lib/server/db/schema';
import { getTimeBlockHours, isBookingActive } from '$lib/server/booking';
import { TIMEZONE } from '$lib/types/bookings';

const RESOURCE_LABELS = {
	laundry_room: 'Tvättid',
	outdoor_area: 'Uteplats'
} as const;

export async function getExistingToken(userId: string): Promise<string | null> {
	const existing = await db
		.select({ token: calendarToken.token })
		.from(calendarToken)
		.where(eq(calendarToken.userId, userId))
		.limit(1);

	return existing.length > 0 ? existing[0].token : null;
}

export async function createToken(userId: string): Promise<string> {
	const existing = await getExistingToken(userId);
	if (existing) return existing;

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

export async function deleteToken(userId: string): Promise<void> {
	await db.delete(calendarToken).where(eq(calendarToken.userId, userId));
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

function todayStr(now: ZonedDateTime): string {
	return `${now.year}-${pad(now.month)}-${pad(now.day)}`;
}

export async function generateCalendarFeed(userId: string, now: ZonedDateTime): Promise<string> {
	const rows = await db
		.select({
			bookingId: booking.id,
			resource: booking.resource,
			date: booking.date,
			timeBlockId: booking.timeBlockId
		})
		.from(booking)
		.where(and(eq(booking.userId, userId), gte(booking.date, todayStr(now))));

	const cal = ical({
		name: 'BRF Skiftesgatan 4 - Bokningar',
		prodId: '//BRF Skiftesgatan 4//Bokningar//SV',
		method: ICalCalendarMethod.PUBLISH,
		timezone: TIMEZONE
	});

	for (const b of rows) {
		const { startHour, endHour } = await getTimeBlockHours(b.timeBlockId);
		if (!isBookingActive({ date: b.date, endHour }, now)) continue;

		cal.createEvent({
			id: `booking-${b.bookingId}@skiftesgatan.se`,
			summary: RESOURCE_LABELS[b.resource],
			start: new Date(`${b.date}T${pad(startHour)}:00:00`),
			end: new Date(`${b.date}T${pad(endHour)}:00:00`),
			timezone: TIMEZONE,
			location: 'Skiftesgatan 4 41739 Göteborg'
		});
	}

	return cal.toString();
}
