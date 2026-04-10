<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults, canonical } from '$lib/meta';
	import { allPages } from 'content-collections';
	import { page } from '$app/state';
	import { error } from '@sveltejs/kit';

	const entry = $derived.by(() => {
		const path = 'information/' + page.params.slug;
		const found = allPages.find((p) => p._meta.path === path);
		if (!found) {
			error(404, 'Not found');
		}
		return found;
	});
</script>

<MetaTags {...metaDefaults} title={entry.title} canonical={canonical(page.url)} />

<h1 class="mb-6 font-heading text-2xl font-normal">{entry.title}</h1>

<!-- eslint-disable svelte/no-at-html-tags -- build-time compiled markdown -->
<div class="prose max-w-170">
	{@html entry.html}
</div>
