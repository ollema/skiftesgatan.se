import * as v from 'valibot';
import { query, form, command } from '$app/server';
import { db } from '$lib/server/db';
import { task } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const getTasks = query(async () => {
	return await db.select().from(task).orderBy(task.priority);
});

export const createTask = form(
	v.object({
		title: v.pipe(v.string(), v.nonEmpty('Title is required')),
		priority: v.pipe(v.number(), v.minValue(1), v.maxValue(5))
	}),
	async ({ title, priority }) => {
		await db.insert(task).values({ title, priority });
		await getTasks().refresh();
	}
);

export const deleteTask = command(v.number(), async (id) => {
	await db.delete(task).where(eq(task.id, id));
	getTasks().refresh();
});
