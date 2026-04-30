import { describe, it, expect } from 'vitest';
import { slotPhrase, slotTimeRange } from './log.prose';

describe('slotTimeRange', () => {
	const date = '2026-05-04';

	it('renders the time range from explicit start and end hours', () => {
		expect(slotTimeRange(date, 7, 10)).toBe('2026-05-04 07:00-10:00');
	});

	it('renders multi-digit hours with zero-padding for the morning blocks', () => {
		expect(slotTimeRange(date, 19, 22)).toBe('2026-05-04 19:00-22:00');
	});

	it('renders the all-day Outdoor Area block', () => {
		expect(slotTimeRange(date, 7, 22)).toBe('2026-05-04 07:00-22:00');
	});

	it('renders an arbitrary historic block whose hours are absent from the current TIME_BLOCKS', () => {
		expect(slotTimeRange(date, 8, 11)).toBe('2026-05-04 08:00-11:00');
	});
});

describe('slotPhrase', () => {
	const date = '2026-05-04';

	it('prepends "the <resource>" to the time range', () => {
		expect(slotPhrase('laundry_room', date, 10, 13)).toBe(
			'the laundry_room 2026-05-04 10:00-13:00'
		);
	});

	it('renders Outdoor Area with full prefix', () => {
		expect(slotPhrase('outdoor_area', date, 7, 22)).toBe('the outdoor_area 2026-05-04 07:00-22:00');
	});
});
