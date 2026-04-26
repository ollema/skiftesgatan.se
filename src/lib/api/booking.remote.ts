import * as v from 'valibot';
import { CalendarDate, Time, now, today } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command, requested } from '$app/server';
import { requireAuth, getAuthUser } from '$lib/server/auth';
import { log } from '$lib/server/log';
import {
	getBookingCalendar,
	getTimeslotStartHour,
	hasExistingFutureBooking,
	createBooking as createBookingDb,
	cancelBooking as cancelBookingDb,
	validateBookingDate
} from '$lib/server/booking';
import { createBookingNotifications } from '$lib/server/notification';
import { TIMEZONE, RESOURCES, type BookingTimeSlot } from '$lib/types/bookings';

const resourceSchema = v.picklist(RESOURCES);
const calendarDateSchema = v.instance(CalendarDate);

export const getBookingData = query(
	v.object({
		resource: resourceSchema
	}),
	async ({ resource }) => {
		const rawRows = await getBookingCalendar(resource);
		const user = getAuthUser();
		const zdt = now(TIMEZONE);
		const fetchedAt = new Time(zdt.hour, zdt.minute, zdt.second);

		// Extract unique timeslots (ordered by startHour from the query)
		const timeslotSet = new Map<number, { startHour: number; endHour: number }>();
		for (const row of rawRows) {
			if (!timeslotSet.has(row.timeslotId)) {
				timeslotSet.set(row.timeslotId, {
					startHour: row.startHour,
					endHour: row.endHour
				});
			}
		}
		const timeslots = [...timeslotSet.entries()];

		// Build a map of (date:timeslotId) -> booking info
		const bookingMap = new Map<
			string,
			{ bookingId: number; userId: string; username: string | null }
		>();
		for (const row of rawRows) {
			if (row.date !== null && row.bookingId !== null) {
				bookingMap.set(`${row.date}:${row.timeslotId}`, {
					bookingId: row.bookingId,
					userId: row.userId!,
					username: row.username
				});
			}
		}

		// Generate calendar for each day in range
		const start = today(TIMEZONE);
		const end = start.add({ months: 1 });

		const bookingCalendar: Record<string, BookingTimeSlot[]> = {};
		let activeBooking: BookingTimeSlot | undefined = undefined;

		let current = start;
		while (current.compare(end) <= 0) {
			const dateStr = current.toString();
			const bookingsTimeSlots: BookingTimeSlot[] = [];

			for (const [tid, ts] of timeslots) {
				const b = bookingMap.get(`${dateStr}:${tid}`);
				const status = b === undefined ? 'free' : b.userId === user?.id ? 'mine' : 'other';

				bookingsTimeSlots.push({
					timeslotId: tid,
					date: current,
					start: ts.startHour,
					end: ts.endHour,
					status,
					bookingId: b?.bookingId ?? null,
					username: user ? (b?.username ?? null) : null
				});

				if (activeBooking === undefined && b !== undefined && b?.userId === user?.id) {
					activeBooking = {
						timeslotId: tid,
						date: current,
						start: ts.startHour,
						end: ts.endHour,
						status,
						bookingId: b.bookingId,
						username: b.username
					};
				}
			}

			bookingCalendar[dateStr] = bookingsTimeSlots;
			current = current.add({ days: 1 });
		}

		return { bookingCalendar, activeBooking, fetchedAt };
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

		const startHour = await getTimeslotStartHour(timeslotId);

		if (replaceBookingId !== undefined) {
			const cancelled = await cancelBookingDb(replaceBookingId, user.id);
			if (!cancelled) {
				error(404, 'Befintlig bokning hittades inte');
			}
			log.info(
				`[booking] cancelled username=${user.username} resource=${cancelled.resource} date=${cancelled.date} startHour=${cancelled.startHour}`
			);
		} else {
			const alreadyBooked = await hasExistingFutureBooking(user.id, resource);
			if (alreadyBooked) {
				error(409, 'Du har redan en kommande bokning');
			}
		}

		try {
			const [result] = await createBookingDb(user.id, timeslotId, resource, date);
			log.info(
				`[booking] created username=${user.username} resource=${resource} date=${date} startHour=${startHour}`
			);
			try {
				await createBookingNotifications(result.id, user.id, resource, date.toString(), timeslotId);
			} catch (e) {
				log.warn(
					`[notification] failed to create notifications username=${user.username} resource=${resource} date=${date} startHour=${startHour}: ${e}`
				);
			}
			await getBookingData({ resource }).refresh();
			return result;
		} catch (e: unknown) {
			if (e instanceof Error && 'code' in e && (e as { code: string }).code === '23505') {
				log.warn(
					`[booking] conflict username=${user.username} resource=${resource} date=${date} startHour=${startHour}`
				);
				error(409, 'Tiden är redan bokad');
			}
			throw e;
		}
	}
);

export const cancelBooking = command(v.object({ bookingId: v.number() }), async ({ bookingId }) => {
	const user = requireAuth();

	const result = await cancelBookingDb(bookingId, user.id);
	if (!result) {
		error(404, 'Bokningen hittades inte');
	}
	log.info(
		`[booking] cancelled username=${user.username} resource=${result.resource} date=${result.date} startHour=${result.startHour}`
	);

	await requested(getBookingData, 5).refreshAll();
});
