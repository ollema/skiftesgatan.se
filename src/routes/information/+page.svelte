<script lang="ts">
	import { allPages } from 'content-collections';
	import { resolve } from '$app/paths';

	const informationPages = allPages.filter((page) =>
		page._meta.directory.startsWith('information')
	);
</script>

<h1 class="mb-12 font-heading text-3xl font-normal">Information</h1>

<div class="flex flex-col gap-6">
	{#each informationPages as page (page._meta.path)}
		<a href={resolve(`/${page._meta.path}` as `/information/${string}`)} class="text-lg">
			{page.title}
		</a>
	{/each}
</div>
