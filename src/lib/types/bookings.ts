import type { CalendarDate } from '@internationalized/date';

export const TIMEZONE = 'Europe/Stockholm';
export const RESOURCES = ['laundry_room', 'outdoor_area'] as const;
export type Resource = (typeof RESOURCES)[number];

type TimeBlock = { startHour: number; endHour: number };

// The current Time Block schedule. Source of truth for live decisions
// (current grid, log prose, seed). Historic Time Block rows in the DB may not
// appear here — see ADR-0004.
export const TIME_BLOCKS: Record<Resource, ReadonlyArray<TimeBlock>> = {
	laundry_room: [
		{ startHour: 7, endHour: 10 },
		{ startHour: 10, endHour: 13 },
		{ startHour: 13, endHour: 16 },
		{ startHour: 16, endHour: 19 },
		{ startHour: 19, endHour: 22 }
	],
	outdoor_area: [{ startHour: 7, endHour: 22 }]
};

export function findTimeBlock(resource: Resource, startHour: number): TimeBlock {
	const block = TIME_BLOCKS[resource].find((b) => b.startHour === startHour);
	if (!block) {
		throw new Error(`unknown time block for ${resource} startHour=${startHour}`);
	}
	return block;
}

export type SlotStatus = 'free' | 'mine' | 'other' | 'past';

export type Slot = {
	timeBlockId: number;
	date: CalendarDate;
	start: number;
	end: number;
	status: SlotStatus;
	bookingId: number | null;
	username: string | null;
};
