import { findTimeBlock, type Resource } from '$lib/types/bookings';

function pad2(n: number): string {
	return n.toString().padStart(2, '0');
}

// Renders the date + time range of a Slot — "2026-05-04 10:00-13:00". The
// end-hour is resolved from the Facility's Time Block table rather than
// passed in, so call sites carry the (resource, date, startHour) trio they
// already have.
export function slotTimeRange(resource: Resource, date: string, startHour: number): string {
	const { startHour: start, endHour: end } = findTimeBlock(resource, startHour);
	return `${date} ${pad2(start)}:00-${pad2(end)}:00`;
}

// Renders a Slot in the canonical prose form used in server logs:
// "the laundry_room 2026-05-04 10:00-13:00". Snake_case enum values stay
// literal — see ADR-0003.
export function slotPhrase(resource: Resource, date: string, startHour: number): string {
	return `the ${resource} ${slotTimeRange(resource, date, startHour)}`;
}
