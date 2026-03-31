<script lang="ts">
	import { allPages } from 'content-collections';

	const entry = allPages.find((p) => p._meta.path === 'kontakt')!;
</script>

<h1 class="mb-10 font-heading text-2xl font-normal">{entry.title}</h1>

<!-- eslint-disable svelte/no-at-html-tags -- build-time compiled markdown -->
<div class="prose max-w-170">
	{@html entry.html}
</div>
