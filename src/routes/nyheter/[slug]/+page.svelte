<script lang="ts">
	import { allNews } from 'content-collections';
	import { page } from '$app/state';
	import { error } from '@sveltejs/kit';
	import { parseDate, DateFormatter } from '@internationalized/date';
	import { TIMEZONE } from '$lib/types/bookings';

	const article = $derived.by(() => {
		const found = allNews.find((n) => n._meta.path === page.params.slug);
		if (!found) {
			error(404, 'Not found');
		}
		return found;
	});

	const df = new DateFormatter('sv-SE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: TIMEZONE
	});
</script>

<h1 class="mb-3 font-heading text-2xl font-normal">{article.title}</h1>

<p class="mb-6 text-xs tracking-widest text-text-muted uppercase">
	{df.format(parseDate(article.date).toDate(TIMEZONE))}
</p>

<!-- eslint-disable svelte/no-at-html-tags -- build-time compiled markdown -->
<div class="prose max-w-170">
	{@html article.html}
</div>
