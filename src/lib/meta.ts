import type { MetaTagsProps } from 'svelte-meta-tags';

export const metaDefaults = {
	titleTemplate: '%s — BRF Skiftesgatan 4',
	openGraph: {
		type: 'website',
		locale: 'sv_SE',
		siteName: 'BRF Skiftesgatan 4'
	}
} satisfies MetaTagsProps;

export function canonical(url: URL): string {
	return `${url.origin}${url.pathname}`;
}
