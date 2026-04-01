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
	// getDayOfWeek returns 0=Monday in sv-SE locale
	return `${WEEKDAYS[dayIndex]} ${date.day} ${MONTHS[date.month - 1]}`;
}

export function buildNotificationEmail(params: {
	resource: Resource;
	date: string;
	startHour: number;
	endHour: number;
	referenceDate?: CalendarDate;
}): { subject: string; html: string } {
	const date = parseDate(params.date);
	const ref = params.referenceDate ?? today(TIMEZONE);
	const resourceName = RESOURCE_NAMES[params.resource];
	const relativeDay = formatRelativeDay(date, ref);
	const timeRange = `${pad(params.startHour)}:00\u2013${pad(params.endHour)}:00`;

	const subject = `Påminnelse: ${resourceName} ${relativeDay} kl ${timeRange}`;
	const html = `<p>Hej!</p><p>Du har en bokning i ${resourceName.toLowerCase()} ${relativeDay} kl ${timeRange}.</p>`;

	return { subject, html };
}
