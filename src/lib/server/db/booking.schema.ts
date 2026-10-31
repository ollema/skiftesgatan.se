import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';
import type { Resource } from '#lib/types/bookings.js';

export const RESOURCE_VALUES = ['laundry_room', 'outdoor_area'] as const;

export const resource = () => text('resource', { enum: RESOURCE_VALUES });

// Compile-time check: Drizzle enum values must match the shared Resource type
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AssertResourceMatch = (typeof RESOURCE_VALUES)[number] extends Resource
	? Resource extends (typeof RESOURCE_VALUES)[number]
		? true
		: never
	: never;

export const timeBlock = sqliteTable(
	'time_block',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		startHour: integer('start_hour').notNull(),
		endHour: integer('end_hour').notNull(),
		resource: resource().notNull()
	},
	(table) => [
		unique('time_block_hours_resource_unique').on(table.startHour, table.endHour, table.resource)
	]
);

export const booking = sqliteTable(
	'booking',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		timeBlockId: integer('time_block_id')
			.notNull()
			.references(() => timeBlock.id),
		resource: resource().notNull(),
		date: text('date').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull()
	},
	(table) => [
		unique('booking_resource_time_block_date_unique').on(
			table.resource,
			table.timeBlockId,
			table.date
		)
	]
);
