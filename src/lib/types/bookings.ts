import type { CalendarDate } from '@internationalized/date';

export const TIMEZONE = 'Europe/Stockholm';
export const RESOURCES = ['laundry_room', 'outdoor_area'] as const;
export type Resource = (typeof RESOURCES)[number];

export type BookingTimeSlotStatus = 'free' | 'mine' | 'other';

export type BookingTimeSlot = {
	timeslotId: number;
	date: CalendarDate;
	start: number;
	end: number;
	status: BookingTimeSlotStatus;
	bookingId: number | null;
	username: string | null;
};
