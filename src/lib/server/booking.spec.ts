import { describe, it, expect } from 'vitest';
import { today } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { buildBookingPayload, validateBookingDate, type BookingCalendarRow } from './booking';

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

describe('buildBookingPayload', () => {
	const me = { id: 'apt-A1001' };
	const someoneElse = { id: 'apt-B2002' };
	const start = today(TIMEZONE);
	const end = start.add({ months: 1 });
	const startStr = start.toString();
	const endStr = end.toString();

	function expectedDateStrings(): string[] {
		const dates: string[] = [];
		let d = start;
		while (d.compare(end) <= 0) {
			dates.push(d.toString());
			d = d.add({ days: 1 });
		}
		return dates;
	}

	it('returns an empty slot array per day in the Booking Window when there are no time blocks', () => {
		const { bookingCalendar, activeBooking } = buildBookingPayload([], me);

		const dates = expectedDateStrings();
		expect(Object.keys(bookingCalendar).sort()).toEqual([...dates].sort());
		for (const d of dates) {
			expect(bookingCalendar[d]).toEqual([]);
		}
		expect(activeBooking).toBeUndefined();
	});

	it('marks every Slot free when no Apartment has booked anything', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			}
		];

		const { bookingCalendar, activeBooking } = buildBookingPayload(rows, me);

		const dates = expectedDateStrings();
		for (const d of dates) {
			expect(bookingCalendar[d]).toHaveLength(1);
			const slot = bookingCalendar[d][0];
			expect(slot.status).toBe('free');
			expect(slot.bookingId).toBeNull();
			expect(slot.username).toBeNull();
			expect(slot.start).toBe(7);
			expect(slot.end).toBe(10);
			expect(slot.timeBlockId).toBe(1);
		}
		expect(activeBooking).toBeUndefined();
	});

	it('tags the calling Apartment\'s Slot as "mine" and surfaces it as activeBooking', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 42,
				userId: me.id,
				username: 'A1001'
			}
		];

		const { bookingCalendar, activeBooking } = buildBookingPayload(rows, me);

		const todaySlot = bookingCalendar[startStr][0];
		expect(todaySlot.status).toBe('mine');
		expect(todaySlot.bookingId).toBe(42);
		expect(todaySlot.username).toBe('A1001');

		expect(activeBooking).toBeDefined();
		expect(activeBooking?.bookingId).toBe(42);
		expect(activeBooking?.status).toBe('mine');
		expect(activeBooking?.date.toString()).toBe(startStr);
	});

	it('picks the earliest Slot as activeBooking when the Apartment has multiple Bookings in the rows', () => {
		const laterStr = start.add({ days: 5 }).toString();
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: laterStr,
				bookingId: 99,
				userId: me.id,
				username: 'A1001'
			},
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 42,
				userId: me.id,
				username: 'A1001'
			}
		];

		const { activeBooking } = buildBookingPayload(rows, me);

		expect(activeBooking?.bookingId).toBe(42);
		expect(activeBooking?.date.toString()).toBe(startStr);
	});

	it('tags another Apartment\'s Slot as "other" and exposes their username to a signed-in caller', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 7,
				userId: someoneElse.id,
				username: 'B2002'
			}
		];

		const { bookingCalendar, activeBooking } = buildBookingPayload(rows, me);

		const slot = bookingCalendar[startStr][0];
		expect(slot.status).toBe('other');
		expect(slot.bookingId).toBe(7);
		expect(slot.username).toBe('B2002');
		expect(activeBooking).toBeUndefined();
	});

	it('hides usernames from anonymous callers but still tags Slots as "other"', () => {
		const rows: BookingCalendarRow[] = [
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: startStr,
				bookingId: 7,
				userId: someoneElse.id,
				username: 'B2002'
			}
		];

		const { bookingCalendar, activeBooking } = buildBookingPayload(rows, null);

		const slot = bookingCalendar[startStr][0];
		expect(slot.status).toBe('other');
		expect(slot.bookingId).toBe(7);
		expect(slot.username).toBeNull();
		expect(activeBooking).toBeUndefined();
	});

	it('covers every day from today through today + 1 month and reflects bookings at both ends of the Window', () => {
		const midStr = start.add({ days: 7 }).toString();
		const rows: BookingCalendarRow[] = [
			// Five laundry-room time blocks — emit one row per block as the "no booking" baseline
			{
				timeBlockId: 1,
				startHour: 7,
				endHour: 10,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 2,
				startHour: 10,
				endHour: 13,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 3,
				startHour: 13,
				endHour: 16,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 4,
				startHour: 16,
				endHour: 19,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			{
				timeBlockId: 5,
				startHour: 19,
				endHour: 22,
				date: null,
				bookingId: null,
				userId: null,
				username: null
			},
			// Today: another Apartment claimed the 10–13 Slot
			{
				timeBlockId: 2,
				startHour: 10,
				endHour: 13,
				date: startStr,
				bookingId: 100,
				userId: someoneElse.id,
				username: 'B2002'
			},
			// One week in: the calling Apartment booked 13–16
			{
				timeBlockId: 3,
				startHour: 13,
				endHour: 16,
				date: midStr,
				bookingId: 101,
				userId: me.id,
				username: 'A1001'
			},
			// Far end of the window: another Apartment booked 19–22
			{
				timeBlockId: 5,
				startHour: 19,
				endHour: 22,
				date: endStr,
				bookingId: 102,
				userId: someoneElse.id,
				username: 'B2002'
			}
		];

		const { bookingCalendar, activeBooking } = buildBookingPayload(rows, me);

		const dates = expectedDateStrings();
		expect(Object.keys(bookingCalendar)).toHaveLength(dates.length);
		expect(bookingCalendar[startStr]).toBeDefined();
		expect(bookingCalendar[endStr]).toBeDefined();

		for (const d of dates) {
			expect(bookingCalendar[d]).toHaveLength(5);
			expect(bookingCalendar[d].map((s) => s.start)).toEqual([7, 10, 13, 16, 19]);
		}

		const todaySlots = bookingCalendar[startStr];
		expect(todaySlots[0].status).toBe('free');
		expect(todaySlots[1].status).toBe('other');
		expect(todaySlots[1].bookingId).toBe(100);
		expect(todaySlots[1].username).toBe('B2002');

		const midSlots = bookingCalendar[midStr];
		expect(midSlots[2].status).toBe('mine');
		expect(midSlots[2].bookingId).toBe(101);

		const endSlots = bookingCalendar[endStr];
		expect(endSlots[4].status).toBe('other');
		expect(endSlots[4].bookingId).toBe(102);

		expect(activeBooking?.bookingId).toBe(101);
		expect(activeBooking?.date.toString()).toBe(midStr);
	});
});
