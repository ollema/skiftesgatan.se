import { describe, it, expect } from 'vitest';
import { slotPhrase, slotTimeRange } from './log.prose';

describe('slotTimeRange', () => {
	const date = '2026-05-04';

	it('renders Laundry Room 07-10', () => {
		expect(slotTimeRange('laundry_room', date, 7)).toBe('2026-05-04 07:00-10:00');
	});

	it('renders Laundry Room 10-13', () => {
		expect(slotTimeRange('laundry_room', date, 10)).toBe('2026-05-04 10:00-13:00');
	});

	it('renders Laundry Room 13-16', () => {
		expect(slotTimeRange('laundry_room', date, 13)).toBe('2026-05-04 13:00-16:00');
	});

	it('renders Laundry Room 16-19', () => {
		expect(slotTimeRange('laundry_room', date, 16)).toBe('2026-05-04 16:00-19:00');
	});

	it('renders Laundry Room 19-22', () => {
		expect(slotTimeRange('laundry_room', date, 19)).toBe('2026-05-04 19:00-22:00');
	});

	it('renders Outdoor Area 07-22', () => {
		expect(slotTimeRange('outdoor_area', date, 7)).toBe('2026-05-04 07:00-22:00');
	});

	it('throws on unknown start hour', () => {
		expect(() => slotTimeRange('laundry_room', date, 8)).toThrow();
	});
});

describe('slotPhrase', () => {
	const date = '2026-05-04';

	it('prepends "the <resource>" to the time range', () => {
		expect(slotPhrase('laundry_room', date, 10)).toBe('the laundry_room 2026-05-04 10:00-13:00');
	});

	it('renders Outdoor Area with full prefix', () => {
		expect(slotPhrase('outdoor_area', date, 7)).toBe('the outdoor_area 2026-05-04 07:00-22:00');
	});
});
