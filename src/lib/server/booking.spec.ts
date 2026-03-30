import { describe, it, expect } from 'vitest';
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';
import { validateBookingDate } from './booking';

describe('validateBookingDate', () => {
	const now = today(getLocalTimeZone());

	it('accepts today', () => {
		expect(() => validateBookingDate(now)).not.toThrow();
	});

	it('accepts tomorrow', () => {
		expect(() => validateBookingDate(now.add({ days: 1 }))).not.toThrow();
	});

	it('accepts 30 days from now', () => {
		expect(() => validateBookingDate(now.add({ days: 30 }))).not.toThrow();
	});

	it('rejects yesterday', () => {
		expect(() => validateBookingDate(now.subtract({ days: 1 }))).toThrow('Cannot book in the past');
	});

	it('rejects 31 days from now', () => {
		expect(() => validateBookingDate(now.add({ days: 31 }))).toThrow(
			'Cannot book more than 30 days in advance'
		);
	});
});
