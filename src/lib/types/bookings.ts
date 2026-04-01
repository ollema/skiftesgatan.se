import type { CalendarDateTime } from '@internationalized/date';

export const RESOURCES = ['laundry_room', 'outdoor_area'] as const;
export type Resource = (typeof RESOURCES)[number];

export type Slot = {
	id: number;
	start: CalendarDateTime;
	end: CalendarDateTime;
	bookingId: number | null;
	userId: string | null;
	username: string | null;
};

export type UpcomingBooking = {
	timeslotId: number;
	start: CalendarDateTime;
	end: CalendarDateTime;
	bookingId: number;
	userId: string | null;
	username: string | null;
};
