import { describe, it, expect } from 'vitest';
import { today } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { validateBookingDate } from './booking';

describe('validateBookingDate', () => {
	const now = today(TIMEZONE);

	it('accepts today', () => {
		expect(validateBookingDate(now)).toBeNull();
	});

	it('accepts tomorrow', () => {
		expect(validateBookingDate(now.add({ days: 1 }))).toBeNull();
	});

	it('accepts one month from now', () => {
		expect(validateBookingDate(now.add({ months: 1 }))).toBeNull();
	});

	it('returns "past" for yesterday', () => {
		expect(validateBookingDate(now.subtract({ days: 1 }))).toBe('past');
	});

	it('returns "too_far" for more than one month from now', () => {
		expect(validateBookingDate(now.add({ months: 1, days: 1 }))).toBe('too_far');
	});
});
