import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';
import { resource } from './booking.schema';

export const facilityClosure = sqliteTable(
	'facility_closure',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		resource: resource().notNull(),
		startDate: text('start_date').notNull(),
		endDate: text('end_date').notNull(),
		reason: text('reason'),
		cancelledCount: integer('cancelled_count').default(0).notNull(),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull()
	},
	(table) => [
		index('facility_closure_resource_dates_idx').on(table.resource, table.startDate, table.endDate),
		check('facility_closure_date_order', sql`${table.startDate} <= ${table.endDate}`)
	]
);
