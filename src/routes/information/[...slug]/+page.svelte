<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults, canonical } from '$lib/meta';
	import { allInformation } from 'content-collections';
	import { page } from '$app/state';
	import { error } from '@sveltejs/kit';

	const entry = $derived.by(() => {
		const found = allInformation.find((p) => p._meta.path === page.params.slug);
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
