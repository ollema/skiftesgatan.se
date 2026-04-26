import {
	pgTable,
	pgEnum,
	serial,
	integer,
	text,
	date,
	timestamp,
	unique
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import type { Resource } from '$lib/types/bookings';

export const resourceEnum = pgEnum('resource', ['laundry_room', 'outdoor_area']);

// Compile-time check: Drizzle enum values must match the shared Resource type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AssertResourceMatch = (typeof resourceEnum.enumValues)[number] extends Resource
	? Resource extends (typeof resourceEnum.enumValues)[number]
		? true
		: never
	: never;

export const timeslot = pgTable(
	'timeslot',
	{
		id: serial('id').primaryKey(),
		startHour: integer('start_hour').notNull(),
		endHour: integer('end_hour').notNull(),
		resource: resourceEnum().notNull()
	},
	(table) => [
		unique('timeslot_hours_resource_unique').on(table.startHour, table.endHour, table.resource)
	]
);

export const booking = pgTable(
	'booking',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		timeslotId: integer('timeslot_id')
			.notNull()
			.references(() => timeslot.id),
		resource: resourceEnum().notNull(),
		date: date('date').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		unique('booking_resource_timeslot_date_unique').on(table.resource, table.timeslotId, table.date)
	]
);
