import { describe, it, expect } from 'vitest';
import { findTimeBlock } from './bookings';

describe('findTimeBlock', () => {
	it('returns the 07–10 Time Block for the Laundry Room', () => {
		expect(findTimeBlock('laundry_room', 7)).toEqual({ startHour: 7, endHour: 10 });
	});

	it('resolves every Laundry Room start hour to the matching block', () => {
		expect(findTimeBlock('laundry_room', 10)).toEqual({ startHour: 10, endHour: 13 });
		expect(findTimeBlock('laundry_room', 13)).toEqual({ startHour: 13, endHour: 16 });
		expect(findTimeBlock('laundry_room', 16)).toEqual({ startHour: 16, endHour: 19 });
		expect(findTimeBlock('laundry_room', 19)).toEqual({ startHour: 19, endHour: 22 });
	});

	it('returns the 07–22 Time Block for the Outdoor Area', () => {
		expect(findTimeBlock('outdoor_area', 7)).toEqual({ startHour: 7, endHour: 22 });
	});

	it('throws when no Time Block matches the start hour', () => {
		expect(() => findTimeBlock('laundry_room', 8)).toThrow(/unknown time block/);
		expect(() => findTimeBlock('outdoor_area', 10)).toThrow(/unknown time block/);
	});
});
