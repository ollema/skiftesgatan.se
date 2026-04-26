import { requireAdmin } from '$lib/server/auth';

export const load = async () => {
	requireAdmin();
};
