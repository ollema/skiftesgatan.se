<script lang="ts">
	import { allNews } from 'content-collections';
	import { resolve } from '$app/paths';

	const sorted = allNews.toSorted(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);
</script>

<h1 class="mb-12 font-heading text-3xl font-normal">Nyheter</h1>

<div class="flex flex-col gap-10">
	{#each sorted as item (item._meta.path)}
		<a
			href={resolve(`/nyheter/${item._meta.path}` as `/nyheter/${string}`)}
			class="block no-underline"
		>
			<time
				class="mb-2 block text-xs tracking-widest text-text-muted uppercase"
				datetime={item.date}
			>
				{new Date(item.date).toLocaleDateString('sv-SE', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</time>
			<h2 class="mb-2 font-heading text-xl font-normal text-text-primary">{item.title}</h2>
			<p class="text-sm text-text-secondary">{item.summary}</p>
		</a>
	{/each}
</div>
