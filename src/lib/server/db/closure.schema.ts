import { sql } from 'drizzle-orm';
import { pgTable, serial, integer, text, date, timestamp, index, check } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { resourceEnum } from './booking.schema';

export const facilityClosure = pgTable(
	'facility_closure',
	{
		id: serial('id').primaryKey(),
		resource: resourceEnum().notNull(),
		startDate: date('start_date').notNull(),
		endDate: date('end_date').notNull(),
		reason: text('reason'),
		cancelledCount: integer('cancelled_count').default(0).notNull(),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('facility_closure_resource_dates_idx').on(table.resource, table.startDate, table.endDate),
		check('facility_closure_date_order', sql`${table.startDate} <= ${table.endDate}`)
	]
);
