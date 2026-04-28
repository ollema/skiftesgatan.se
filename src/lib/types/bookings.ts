import type { CalendarDate } from '@internationalized/date';

export const TIMEZONE = 'Europe/Stockholm';
export const RESOURCES = ['laundry_room', 'outdoor_area'] as const;
export type Resource = (typeof RESOURCES)[number];

export type SlotStatus = 'free' | 'mine' | 'other';

export type Slot = {
	timeBlockId: number;
	date: CalendarDate;
	start: number;
	end: number;
	status: SlotStatus;
	bookingId: number | null;
	username: string | null;
};
