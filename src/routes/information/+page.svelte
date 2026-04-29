<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults, canonical } from '$lib/meta';
	import { page } from '$app/state';
	import { allInformation } from 'content-collections';
	import { resolve } from '$app/paths';

	const informationPages = allInformation;
</script>

<MetaTags
	{...metaDefaults}
	title="Information"
	description="Stadgar, ekonomi, styrelsen och mer."
	canonical={canonical(page.url)}
/>

<h1 class="mb-6 font-heading text-3xl font-normal">Information</h1>

<div class="flex flex-col gap-6">
	{#each informationPages as page (page._meta.path)}
		<a
			href={resolve(`/information/${page._meta.path}` as `/information/${string}`)}
			class="text-lg"
		>
			{page.title}
		</a>
	{/each}
</div>
