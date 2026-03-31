<script lang="ts">
	import { allPages } from 'content-collections';

	const entry = allPages.find((p) => p._meta.path === 'contact')!;
</script>

<h1 class="mb-6 text-2xl font-bold text-gray-900">{entry.title}</h1>

<!-- eslint-disable svelte/no-at-html-tags -- build-time compiled markdown -->
<div class="prose">
	{@html entry.html}
</div>
