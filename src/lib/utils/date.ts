import { TIMEZONE } from '$lib/types/bookings';
import { type CalendarDate, DateFormatter, type DateValue } from '@internationalized/date';

const monthFormatter = new DateFormatter('sv-SE', { month: 'long', timeZone: TIMEZONE });

const dateFormatter = new DateFormatter('sv-SE', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	timeZone: TIMEZONE
});

export function formatMonth(d: DateValue) {
	return monthFormatter.format(d.toDate(TIMEZONE));
}

export function formatDate(d: CalendarDate) {
	return dateFormatter.format(d.toDate(TIMEZONE));
}

export function formatHourNum(hour: number) {
	return `${hour.toString().padStart(2, '0')}:00`;
}

export function formatHourNumShort(hour: number) {
	return `${hour.toString().padStart(2, '0')}`;
}
