import { relations } from 'drizzle-orm';
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

export const resourceEnum = pgEnum('resource', ['laundry_room', 'outdoor_area']);

export const apartment = pgTable('apartment', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' })
});

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
		apartmentId: integer('apartment_id')
			.notNull()
			.references(() => apartment.id),
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

export const apartmentRelations = relations(apartment, ({ one, many }) => ({
	user: one(user, {
		fields: [apartment.userId],
		references: [user.id]
	}),
	bookings: many(booking)
}));

export const timeslotRelations = relations(timeslot, ({ many }) => ({
	bookings: many(booking)
}));

export const bookingRelations = relations(booking, ({ one }) => ({
	apartment: one(apartment, {
		fields: [booking.apartmentId],
		references: [apartment.id]
	}),
	timeslot: one(timeslot, {
		fields: [booking.timeslotId],
		references: [timeslot.id]
	})
}));
