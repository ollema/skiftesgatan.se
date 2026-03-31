<script lang="ts">
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

<h1 class="mb-6 text-2xl font-bold text-gray-900">{entry.title}</h1>

<!-- eslint-disable svelte/no-at-html-tags -- build-time compiled markdown -->
<div class="prose">
	{@html entry.html}
</div>
