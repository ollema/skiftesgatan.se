import {
	CalendarDate,
	CalendarDateTime,
	Time,
	parseDate,
	parseDateTime,
	parseTime
} from '@internationalized/date';
import type { Transport } from '@sveltejs/kit';

export const transport: Transport = {
	CalendarDate: {
		encode: (value) => value instanceof CalendarDate && value.toString(),
		decode: (str) => parseDate(str as string)
	},
	CalendarDateTime: {
		encode: (value) => value instanceof CalendarDateTime && value.toString(),
		decode: (str) => parseDateTime(str as string)
	},
	Time: {
		encode: (value) => value instanceof Time && value.toString(),
		decode: (str) => parseTime(str as string)
	}
};
