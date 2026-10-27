import * as sitemap from 'super-sitemap/sveltekit';
import { allNews, allInformation } from 'content-collections';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return await sitemap.response({
		origin: 'https://skiftesgatan.se',
		excludeRoutePatterns: [
			/^\/konto/,
			/^\/tvattstuga/,
			/^\/uteplats/,
			/^\/kalender/,
			/^\/api/,
			/^\/admin/
		],
		paramValues: {
			'/nyheter/[slug]': allNews.map((n) => n._meta.path),
			'/information/[...slug]': allInformation.map((p) => p._meta.path.split('/'))
		}
	});
};
