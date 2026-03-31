<script lang="ts">
	import { allNews } from 'content-collections';
	import { page } from '$app/state';
	import { error } from '@sveltejs/kit';

	const article = allNews.find((n) => n._meta.path === page.params.slug);

	if (!article) {
		error(404, 'Not found');
	}
</script>

<h1 class="mb-2 text-2xl font-bold text-gray-900">{article.title}</h1>

<p class="mb-6 text-sm text-gray-500">
	{new Date(article.date).toLocaleDateString('sv-SE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})}
</p>

<!-- eslint-disable svelte/no-at-html-tags -- build-time compiled markdown -->
<div class="prose">
	{@html article.html}
</div>
