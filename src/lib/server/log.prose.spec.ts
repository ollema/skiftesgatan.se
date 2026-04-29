import { describe, it, expect } from 'vitest';
import { slotPhrase } from './log.prose';

describe('slotPhrase', () => {
	const date = '2026-05-04';

	it('renders Laundry Room 07-10', () => {
		expect(slotPhrase('laundry_room', date, 7)).toBe('the laundry_room 2026-05-04 07:00-10:00');
	});

	it('renders Laundry Room 10-13', () => {
		expect(slotPhrase('laundry_room', date, 10)).toBe('the laundry_room 2026-05-04 10:00-13:00');
	});

	it('renders Laundry Room 13-16', () => {
		expect(slotPhrase('laundry_room', date, 13)).toBe('the laundry_room 2026-05-04 13:00-16:00');
	});

	it('renders Laundry Room 16-19', () => {
		expect(slotPhrase('laundry_room', date, 16)).toBe('the laundry_room 2026-05-04 16:00-19:00');
	});

	it('renders Laundry Room 19-22', () => {
		expect(slotPhrase('laundry_room', date, 19)).toBe('the laundry_room 2026-05-04 19:00-22:00');
	});

	it('renders Outdoor Area 07-22', () => {
		expect(slotPhrase('outdoor_area', date, 7)).toBe('the outdoor_area 2026-05-04 07:00-22:00');
	});

	it('throws on unknown start hour', () => {
		expect(() => slotPhrase('laundry_room', date, 8)).toThrow();
	});
});
