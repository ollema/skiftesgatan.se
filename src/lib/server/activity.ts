import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { log } from '$lib/server/log';

export async function touchUserActivity(userId: string): Promise<void> {
	try {
		await db.update(user).set({ lastActiveAt: new Date() }).where(eq(user.id, userId));
	} catch (e) {
		log.warn(`[activity] failed to bump lastActiveAt userId=${userId}: ${e}`);
	}
}
