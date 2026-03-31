<script lang="ts">
	import { allPages } from 'content-collections';
	import { resolve } from '$app/paths';

	const informationPages = allPages.filter((page) =>
		page._meta.directory.startsWith('information')
	);
</script>

<h1 class="mb-6 text-2xl font-bold text-gray-900">Information</h1>

<div class="grid gap-4 sm:grid-cols-2">
	{#each informationPages as page (page._meta.path)}
		<a
			href={resolve(`/${page._meta.path}` as `/information/${string}`)}
			class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
		>
			<h2 class="text-lg font-semibold text-gray-900">{page.title}</h2>
		</a>
	{/each}
</div>
