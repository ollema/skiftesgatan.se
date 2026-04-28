import * as v from 'valibot';
import { CalendarDate, Time, now, today } from '@internationalized/date';
import { error } from '@sveltejs/kit';
import { query, command, requested } from '$app/server';
import { requireAuth, getAuthUser } from '$lib/server/auth';
import { log } from '$lib/server/log';
import {
	getBookingCalendar,
	getTimeBlockStartHour,
	bookSlot,
	cancelBooking as cancelBookingDb,
	validateBookingDate
} from '$lib/server/booking';
import { createBookingNotifications } from '$lib/server/notification';
import { touchUserActivity } from '$lib/server/activity';
import { TIMEZONE, RESOURCES, type Slot } from '$lib/types/bookings';

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

		// Extract unique time blocks (ordered by startHour from the query)
		const timeBlockSet = new Map<number, { startHour: number; endHour: number }>();
		for (const row of rawRows) {
			if (!timeBlockSet.has(row.timeBlockId)) {
				timeBlockSet.set(row.timeBlockId, {
					startHour: row.startHour,
					endHour: row.endHour
				});
			}
		}
		const timeBlocks = [...timeBlockSet.entries()];

		// Build a map of (date:timeBlockId) -> booking info
		const bookingMap = new Map<
			string,
			{ bookingId: number; userId: string; username: string | null }
		>();
		for (const row of rawRows) {
			if (row.date !== null && row.bookingId !== null) {
				bookingMap.set(`${row.date}:${row.timeBlockId}`, {
					bookingId: row.bookingId,
					userId: row.userId!,
					username: row.username
				});
			}
		}

		// Generate calendar for each day in range
		const start = today(TIMEZONE);
		const end = start.add({ months: 1 });

		const bookingCalendar: Record<string, Slot[]> = {};
		let activeBooking: Slot | undefined = undefined;

		let current = start;
		while (current.compare(end) <= 0) {
			const dateStr = current.toString();
			const slots: Slot[] = [];

			for (const [tid, tb] of timeBlocks) {
				const b = bookingMap.get(`${dateStr}:${tid}`);
				const status = b === undefined ? 'free' : b.userId === user?.id ? 'mine' : 'other';

				slots.push({
					timeBlockId: tid,
					date: current,
					start: tb.startHour,
					end: tb.endHour,
					status,
					bookingId: b?.bookingId ?? null,
					username: user ? (b?.username ?? null) : null
				});

				if (activeBooking === undefined && b !== undefined && b?.userId === user?.id) {
					activeBooking = {
						timeBlockId: tid,
						date: current,
						start: tb.startHour,
						end: tb.endHour,
						status,
						bookingId: b.bookingId,
						username: b.username
					};
				}
			}

			bookingCalendar[dateStr] = slots;
			current = current.add({ days: 1 });
		}

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
			replaceBookingId
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

	const result = await cancelBookingDb(bookingId, user.id);
	if (!result) {
		error(404, 'Bokningen hittades inte');
	}
	log.info(
		`[booking] cancelled username=${user.username} resource=${result.resource} date=${result.date} startHour=${result.startHour}`
	);

	await touchUserActivity(user.id);

	await requested(getBookingData, 5).refreshAll();
});
