import { requireAdmin } from '#lib/server/auth.js';

export const load = async () => {
	requireAdmin();
};
