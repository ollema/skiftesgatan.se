import { type CalendarDate, parseDate, today, getDayOfWeek } from '@internationalized/date';
import { TIMEZONE, type Resource } from '$lib/types/bookings';

const RESOURCE_NAMES: Record<Resource, string> = {
	laundry_room: 'Tvättstugan',
	outdoor_area: 'Uteplats'
};

const WEEKDAYS = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];
const MONTHS = [
	'januari',
	'februari',
	'mars',
	'april',
	'maj',
	'juni',
	'juli',
	'augusti',
	'september',
	'oktober',
	'november',
	'december'
];

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

function formatRelativeDay(date: CalendarDate, referenceDate: CalendarDate): string {
	const diff = date.compare(referenceDate);
	if (diff === 0) return 'idag';
	if (diff === 1) return 'imorgon';
	const dayIndex = getDayOfWeek(date, 'sv-SE');
	return `${WEEKDAYS[dayIndex]} ${date.day} ${MONTHS[date.month - 1]}`;
}

export function buildBookingReminderVariables(params: {
	resource: Resource;
	date: string;
	startHour: number;
	endHour: number;
	referenceDate?: CalendarDate;
}): {
	RESOURCE: string;
	RESOURCE_LOWER: string;
	RELATIVE_DAY: string;
	TIME_RANGE: string;
} {
	const date = parseDate(params.date);
	const ref = params.referenceDate ?? today(TIMEZONE);
	const resourceName = RESOURCE_NAMES[params.resource];

	return {
		RESOURCE: resourceName,
		RESOURCE_LOWER: resourceName.toLowerCase(),
		RELATIVE_DAY: formatRelativeDay(date, ref),
		TIME_RANGE: `${pad(params.startHour)}:00\u2013${pad(params.endHour)}:00`
	};
}
