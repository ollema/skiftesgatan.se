import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';
import { booking, resource } from './booking.schema';

export const REMINDER_STATUS_VALUES = ['pending', 'sent', 'failed'] as const;

export const reminderPreference = sqliteTable(
	'reminder_preference',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		resource: resource().notNull(),
		enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
		offsetMinutes: integer('offset_minutes').default(1440).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
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

export const bookingReminder = sqliteTable(
	'booking_reminder',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		bookingId: integer('booking_id')
			.notNull()
			.references(() => booking.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		offsetMinutes: integer('offset_minutes').notNull(),
		notifyAt: integer('notify_at', { mode: 'timestamp_ms' }).notNull(),
		status: text('status', { enum: REMINDER_STATUS_VALUES }).default('pending').notNull(),
		sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
		failReason: text('fail_reason'),
		resendId: text('resend_id'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).defaultNow().notNull()
	},
	(table) => [
		unique('booking_reminder_booking_offset_unique').on(table.bookingId, table.offsetMinutes),
		index('booking_reminder_pending_idx').on(table.status, table.notifyAt),
		index('booking_reminder_booking_idx').on(table.bookingId)
	]
);
