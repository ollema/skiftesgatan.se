<script lang="ts">
	import { allNews } from 'content-collections';
	import { resolve } from '$app/paths';

	const sorted = allNews.toSorted(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);
</script>

<h1 class="mb-6 text-2xl font-bold text-gray-900">News</h1>

<div class="grid gap-4 sm:grid-cols-2">
	{#each sorted as item (item._meta.path)}
		<a
			href={resolve(`/news/${item._meta.path}` as `/news/${string}`)}
			class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
		>
			<h2 class="mb-1 text-lg font-semibold text-gray-900">{item.title}</h2>
			<time class="mb-2 block text-sm text-gray-400" datetime={item.date}>
				{new Date(item.date).toLocaleDateString('sv-SE', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</time>
			<p class="text-sm text-gray-500">{item.summary}</p>
		</a>
	{/each}
</div>
