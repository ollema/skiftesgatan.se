import { TIMEZONE } from '$lib/types/bookings';
import { CalendarDate, CalendarDateTime, DateFormatter } from '@internationalized/date';

const dateFormatter = new DateFormatter('sv-SE', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: TIMEZONE
});
const hourFormatter = new DateFormatter('sv-SE', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: TIMEZONE
});

export function formatDate(d: CalendarDate | CalendarDateTime) {
	return dateFormatter.format(d.toDate(TIMEZONE));
}

export function formatHour(d: CalendarDateTime) {
	return hourFormatter.format(d.toDate(TIMEZONE));
}
