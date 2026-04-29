import { response } from 'super-sitemap';
import { allNews, allInformation } from 'content-collections';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return await response({
		origin: 'https://skiftesgatan.se',
		excludeRoutePatterns: ['^/konto', '^/tvattstuga', '^/uteplats', '^/kalender', '^/api'],
		paramValues: {
			'/nyheter/[slug]': allNews.map((n) => n._meta.path),
			'/information/[...slug]': allInformation.map((p) => p._meta.path.split('/'))
		}
	});
};
