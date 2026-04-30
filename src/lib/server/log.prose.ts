import type { Resource } from '$lib/types/bookings';

function pad2(n: number): string {
	return n.toString().padStart(2, '0');
}

// Renders the date + time range of a Slot — "2026-05-04 10:00-13:00". Hours
// are passed in rather than looked up: callers already hold them (from the
// booking command's result, the cancel result, or a join). Per ADR-0004, hours
// for an existing Booking must come from the cache (`getTimeBlockHours`) or a
// join, never from `findTimeBlock` (constant lookup) — historic Bookings
// reference Time Block rows that the current `TIME_BLOCKS` no longer covers.
export function slotTimeRange(date: string, startHour: number, endHour: number): string {
	return `${date} ${pad2(startHour)}:00-${pad2(endHour)}:00`;
}

// Renders a Slot in the canonical prose form used in server logs:
// "the laundry_room 2026-05-04 10:00-13:00". Snake_case enum values stay
// literal — see ADR-0003.
export function slotPhrase(
	resource: Resource,
	date: string,
	startHour: number,
	endHour: number
): string {
	return `the ${resource} ${slotTimeRange(date, startHour, endHour)}`;
}
