import { describe, it, expect } from 'vitest';
import { today } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { validateBookingDate } from './booking';

describe('validateBookingDate', () => {
	const now = today(TIMEZONE);

	it('accepts today', () => {
		expect(() => validateBookingDate(now)).not.toThrow();
	});

	it('accepts tomorrow', () => {
		expect(() => validateBookingDate(now.add({ days: 1 }))).not.toThrow();
	});

	it('accepts one month from now', () => {
		expect(() => validateBookingDate(now.add({ months: 1 }))).not.toThrow();
	});

	it('rejects yesterday', () => {
		expect(() => validateBookingDate(now.subtract({ days: 1 }))).toThrow('Cannot book in the past');
	});

	it('rejects more than one month from now', () => {
		expect(() => validateBookingDate(now.add({ months: 1, days: 1 }))).toThrow(
			'Cannot book more than one month in advance'
		);
	});
});
