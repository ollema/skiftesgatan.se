import {
	pgTable,
	pgEnum,
	serial,
	integer,
	text,
	boolean,
	timestamp,
	unique,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';
import { booking, resourceEnum } from './booking.schema';

export const reminderStatusEnum = pgEnum('reminder_status', ['pending', 'sent', 'failed']);

export const reminderPreference = pgTable(
	'reminder_preference',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		resource: resourceEnum().notNull(),
		enabled: boolean('enabled').default(true).notNull(),
		offsetMinutes: integer('offset_minutes').default(1440).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [
		unique('reminder_preference_user_resource_offset_unique').on(
			table.userId,
			table.resource,
			table.offsetMinutes
		)
	]
);

export const bookingReminder = pgTable(
	'booking_reminder',
	{
		id: serial('id').primaryKey(),
		bookingId: integer('booking_id')
			.notNull()
			.references(() => booking.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		offsetMinutes: integer('offset_minutes').notNull(),
		notifyAt: timestamp('notify_at').notNull(),
		status: reminderStatusEnum().default('pending').notNull(),
		sentAt: timestamp('sent_at'),
		failReason: text('fail_reason'),
		resendId: text('resend_id'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		unique('booking_reminder_booking_offset_unique').on(table.bookingId, table.offsetMinutes),
		index('booking_reminder_pending_idx').on(table.status, table.notifyAt),
		index('booking_reminder_booking_idx').on(table.bookingId)
	]
);
