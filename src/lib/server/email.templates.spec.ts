import { describe, it, expect } from 'vitest';
import { CalendarDate } from '@internationalized/date';
import { EMAIL_TEMPLATES } from './email.templates';

describe('EMAIL_TEMPLATES.bookingReminder.build', () => {
	const ref = new CalendarDate(2026, 4, 15);

	it('uses Swedish resource name for laundry', () => {
		const vars = EMAIL_TEMPLATES.bookingReminder.build({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(vars.RESOURCE).toBe('Tvättstugan');
		expect(vars.RESOURCE_LOWER).toBe('tvättstugan');
	});

	it('uses Swedish resource name for outdoor area', () => {
		const vars = EMAIL_TEMPLATES.bookingReminder.build({
			resource: 'outdoor_area',
			date: '2026-04-16',
			startHour: 7,
			endHour: 22,
			referenceDate: ref
		});
		expect(vars.RESOURCE).toBe('Uteplats');
		expect(vars.RESOURCE_LOWER).toBe('uteplats');
	});

	it('says imorgon when date is tomorrow', () => {
		const vars = EMAIL_TEMPLATES.bookingReminder.build({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(vars.RELATIVE_DAY).toBe('imorgon');
	});

	it('says idag when date is today', () => {
		const vars = EMAIL_TEMPLATES.bookingReminder.build({
			resource: 'laundry_room',
			date: '2026-04-15',
			startHour: 10,
			endHour: 13,
			referenceDate: ref
		});
		expect(vars.RELATIVE_DAY).toBe('idag');
	});

	it('uses weekday and date for dates further away', () => {
		const vars = EMAIL_TEMPLATES.bookingReminder.build({
			resource: 'laundry_room',
			date: '2026-04-20',
			startHour: 7,
			endHour: 10,
			referenceDate: ref
		});
		// 2026-04-20 is a Monday
		expect(vars.RELATIVE_DAY).toBe('måndag 20 april');
	});

	it('formats time range with zero-padded hours and en-dash', () => {
		const vars = EMAIL_TEMPLATES.bookingReminder.build({
			resource: 'laundry_room',
			date: '2026-04-16',
			startHour: 7,
			endHour: 10,
			referenceDate: ref
		});
		expect(vars.TIME_RANGE).toBe('07:00–10:00');
	});
});
