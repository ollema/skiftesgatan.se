import { describe, it, expect } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { computeNotifyAt } from './notification';
import { buildNotificationEmail } from './notification.email';

describe('computeNotifyAt', () => {
	it('subtracts 60 minutes from booking start', () => {
		const result = computeNotifyAt('2026-04-15', 10, 60);
		// 2026-04-15 10:00 Stockholm (CEST, UTC+2) = 08:00 UTC → minus 60 min = 07:00 UTC
		expect(result.toISOString()).toBe('2026-04-15T07:00:00.000Z');
	});

	it('subtracts 1440 minutes (24 hours) crossing day boundary', () => {
		const result = computeNotifyAt('2026-04-15', 7, 1440);
		// 2026-04-15 07:00 Stockholm (CEST, UTC+2) = 05:00 UTC → minus 24h = 2026-04-14 05:00 UTC
		expect(result.toISOString()).toBe('2026-04-14T05:00:00.000Z');
	});

	it('handles DST spring forward (2026-03-29 in Sweden)', () => {
		// Sweden switches CET→CEST on 2026-03-29 at 02:00
		// 2026-03-29 07:00 Stockholm is CEST (UTC+2) = 05:00 UTC
		// Minus 60 min = 06:00 Stockholm = 04:00 UTC (still CEST)
		const result = computeNotifyAt('2026-03-29', 7, 60);
		expect(result.toISOString()).toBe('2026-03-29T04:00:00.000Z');
	});

	it('handles DST spring forward with 24h offset crossing the boundary', () => {
		// 2026-03-29 07:00 Stockholm (CEST, UTC+2) = 05:00 UTC
		// Minus 1440 absolute minutes = 2026-03-28 05:00 UTC = 06:00 CET
		// (24 real hours before, not wall-clock hours)
		const result = computeNotifyAt('2026-03-29', 7, 1440);
		expect(result.toISOString()).toBe('2026-03-28T05:00:00.000Z');
	});
});

describe('buildNotificationEmail', () => {
	const ref = new CalendarDate(2026, 4, 15);

	it('includes Påminnelse in subject', () => {
		const { subject } = buildNotificationEmail({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(subject).toContain('Påminnelse');
	});

	it('uses Swedish resource name for laundry', () => {
		const { subject, html } = buildNotificationEmail({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(subject).toContain('Tvättstugan');
		expect(html).toContain('tvättstugan');
	});

	it('uses Swedish resource name for outdoor area', () => {
		const { subject } = buildNotificationEmail({
			resource: 'outdoor_area',
			date: '2026-04-16',
			startHour: 7,
			endHour: 22,
			referenceDate: ref
		});
		expect(subject).toContain('Uteplats');
	});

	it('says imorgon when date is tomorrow', () => {
		const { subject } = buildNotificationEmail({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(subject).toContain('imorgon');
	});

	it('says idag when date is today', () => {
		const { subject } = buildNotificationEmail({
			resource: 'laundry_room',
			date: '2026-04-15',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(subject).toContain('idag');
	});

	it('uses weekday and date for dates further away', () => {
		const { subject } = buildNotificationEmail({
			resource: 'laundry_room',
			date: '2026-04-20',
			startHour: 7,
			endHour: 10,
			referenceDate: ref
		});
		// 2026-04-20 is a Monday
		expect(subject).toContain('måndag 20 april');
	});

	it('formats time range with zero-padded hours and en-dash', () => {
		const { subject } = buildNotificationEmail({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 7,
			endHour: 10,
			referenceDate: ref
		});
		expect(subject).toContain('07:00\u201310:00');
	});
});
