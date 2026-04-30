import * as v from 'valibot';
import { error, invalid } from '@sveltejs/kit';
import { getRequestEvent, query, command, form } from '$app/server';
import { eq } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { env } from '$env/dynamic/private';
import { auth, requireAdmin } from '$lib/server/auth';
import { apartmentSchema } from '$lib/server/auth.config';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/auth.schema';
import { reminderPreference } from '$lib/server/db/reminder.schema';
import { calendarToken } from '$lib/server/db/calendar.schema';
import { getReminderPreferences, setReminderPreference } from '$lib/server/reminder';
import { getExistingToken, createToken, regenerateToken, deleteToken } from '$lib/server/calendar';
import { RESOURCES } from '$lib/types/bookings';
import { log } from '$lib/server/log';

async function findByUsername(username: string) {
	const [row] = await db
		.select({
			id: userTable.id,
			username: userTable.username,
			name: userTable.name,
			email: userTable.email,
			emailVerified: userTable.emailVerified,
			role: userTable.role
		})
		.from(userTable)
		.where(eq(userTable.username, username))
		.limit(1);
	return row ?? null;
}

function buildCalendarUrl(token: string): string {
	return `${env.ORIGIN}/kalender/${token}.ics`;
}

export const listUsers = query(async () => {
	requireAdmin();
	const [users, reminderRows, calendarRows] = await Promise.all([
		db
			.select({
				id: userTable.id,
				username: userTable.username,
				name: userTable.name,
				role: userTable.role,
				lastActiveAt: userTable.lastActiveAt
			})
			.from(userTable)
			.orderBy(userTable.username),
		db
			.selectDistinct({ userId: reminderPreference.userId })
			.from(reminderPreference)
			.where(eq(reminderPreference.enabled, true)),
		db.select({ userId: calendarToken.userId }).from(calendarToken)
	]);

	const withReminders = new Set(reminderRows.map((r) => r.userId));
	const withCalendar = new Set(calendarRows.map((r) => r.userId));

	return users.map((u) => ({
		...u,
		hasActiveReminderPreference: withReminders.has(u.id),
		hasCalendarSubscription: withCalendar.has(u.id)
	}));
});

export const getUserByUsername = query(
	v.object({ username: apartmentSchema }),
	async ({ username }) => {
		requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		const [preferences, token] = await Promise.all([
			getReminderPreferences(target.id),
			getExistingToken(target.id)
		]);

		return {
			user: target,
			preferences,
			calendarUrl: token ? buildCalendarUrl(token) : null
		};
	}
);

export const updateUserName = form(
	v.object({
		username: apartmentSchema,
		name: v.pipe(v.string(), v.minLength(1), v.maxLength(100))
	}),
	async ({ username, name }) => {
		const self = requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		const { request } = getRequestEvent();
		try {
			await auth.api.adminUpdateUser({
				body: { userId: target.id, data: { name } },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) invalid('Kunde inte byta namn');
			throw e;
		}
		log.info(`[admin] apartment ${self.username} changed display name for apartment ${username}`);
	}
);

export const updateUserEmail = form(
	v.object({
		username: apartmentSchema,
		email: v.pipe(v.string(), v.email('Ogiltig e-postadress'))
	}),
	async ({ username, email }) => {
		const self = requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		const { request } = getRequestEvent();
		try {
			await auth.api.adminUpdateUser({
				body: { userId: target.id, data: { email } },
				headers: request.headers
			});
		} catch (e) {
			if (e instanceof APIError) invalid('Kunde inte byta e-post');
			throw e;
		}
		log.info(`[admin] apartment ${self.username} changed email for apartment ${username}`);
	}
);

export const sendPasswordResetForUser = command(
	v.object({ username: apartmentSchema }),
	async ({ username }) => {
		const self = requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		await auth.api.requestPasswordReset({
			body: { email: target.email, redirectTo: '/konto/aterstall-losenord' }
		});
		log.info(
			`[admin] apartment ${self.username} sent a password reset email to apartment ${username}`
		);
		return { email: target.email };
	}
);

export const setUserRole = command(
	v.object({
		username: apartmentSchema,
		role: v.picklist(['user', 'admin'])
	}),
	async ({ username, role }) => {
		const self = requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');
		if (target.id === self.id) error(400, 'Du kan inte ändra din egen roll');

		const { request } = getRequestEvent();
		await auth.api.setRole({
			body: { userId: target.id, role },
			headers: request.headers
		});
		const verb = role === 'admin' ? 'granted admin role to' : 'revoked admin role from';
		log.info(`[admin] apartment ${self.username} ${verb} apartment ${username}`);
	}
);

export const setUserReminderPreference = command(
	v.object({
		username: apartmentSchema,
		resource: v.picklist(RESOURCES),
		offsetMinutes: v.picklist([60, 1440]),
		enabled: v.boolean()
	}),
	async ({ username, resource, offsetMinutes, enabled }) => {
		const self = requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		await setReminderPreference(target.id, resource, offsetMinutes, enabled);
		const verb = enabled ? 'enabled' : 'disabled';
		log.info(
			`[admin] apartment ${self.username} ${verb} ${offsetMinutes}-minute reminders for the ${resource} for apartment ${username}`
		);
	}
);

export const createUserCalendarUrl = command(
	v.object({ username: apartmentSchema }),
	async ({ username }) => {
		requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		const token = await createToken(target.id);
		return buildCalendarUrl(token);
	}
);

export const regenerateUserCalendarUrl = command(
	v.object({ username: apartmentSchema }),
	async ({ username }) => {
		requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		const token = await regenerateToken(target.id);
		return buildCalendarUrl(token);
	}
);

export const deleteUserCalendarUrl = command(
	v.object({ username: apartmentSchema }),
	async ({ username }) => {
		requireAdmin();
		const target = await findByUsername(username);
		if (!target) error(404, 'Hittade inte lägenheten');

		await deleteToken(target.id);
	}
);
