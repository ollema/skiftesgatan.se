<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults, canonical } from '$lib/meta';
	import { page } from '$app/state';
	import { allNews } from 'content-collections';
	import { resolve } from '$app/paths';
	import { parseDate, DateFormatter } from '@internationalized/date';
	import { TIMEZONE } from '$lib/types/bookings';

	const latestNews = allNews
		.toSorted((a, b) => parseDate(b.date).compare(parseDate(a.date)))
		.slice(0, 3);

	const df = new DateFormatter('sv-SE', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: TIMEZONE
	});
</script>

<MetaTags
	{...metaDefaults}
	title="BRF Skiftesgatan 4"
	titleTemplate={undefined}
	description="Medlemssida för BRF Skiftesgatan 4. 32 lägenheter i ett landshövdingehus från 1939."
	canonical={canonical(page.url)}
/>

<!-- Hero -->
<section class="pt-20 pb-28 text-center">
	<p class="mb-4 text-xs tracking-widest text-text-muted uppercase">Bostadsrättsföreningen</p>
	<h1 class="mb-6 font-heading text-3xl font-normal lg:text-[2.75rem] lg:leading-tight">
		BRF Skiftesgatan 4
	</h1>
	<p class="mx-auto max-w-120 text-lg/relaxed text-text-secondary">
		32 lägenheter i ett landshövdingehus från 1939.
		<br />Ett välskött hem i Göteborg.
	</p>
</section>

<!-- About -->
<section class="mx-auto mb-16 max-w-170">
	<h2 class="font-heading text-xl font-normal">Om föreningen</h2>
	<p class="leading-loose text-text-secondary">
		Bostadsrättsföreningen Skiftesgatan 4 bildades 2012 och äger fastigheten Brämaregården 45:11 i
		Göteborg. Huset uppfördes 1939 och totalrenoverades 2011/2012. Föreningen utökades 2022 från 24
		till 32 lägenheter genom nyproduktion på vindsvåningen.
	</p>
	<a href={resolve('/information/om')} class="mt-4 inline-block text-sm"> Läs mer om föreningen </a>
</section>

<!-- Latest News -->
<section class="mx-auto mb-16 max-w-170">
	<h2 class="mb-6 font-heading text-xl font-normal">Nyheter</h2>
	<div class="flex flex-col gap-10">
		{#each latestNews as item (item._meta.path)}
			<a
				href={resolve(`/nyheter/${item._meta.path}` as `/nyheter/${string}`)}
				class="block no-underline"
			>
				<time
					class="mb-2 block text-xs tracking-widest text-text-muted uppercase"
					datetime={item.date}
				>
					{df.format(parseDate(item.date).toDate(TIMEZONE))}
				</time>
				<h3 class="mb-2 font-heading text-xl font-normal text-text-primary">{item.title}</h3>
				<p class="text-sm text-text-secondary">{item.summary}</p>
			</a>
		{/each}
	</div>
	<a href={resolve('/nyheter')} class="mt-6 inline-block text-sm">Alla nyheter</a>
</section>

<!-- Resident Services -->
<section class="mx-auto max-w-170 pb-16">
	<h2 class="mb-8 font-heading text-xl font-normal">För boende</h2>
	<div class="grid gap-6 sm:grid-cols-2">
		<a
			href={resolve('/tvattstuga')}
			class="block bg-bg-alt p-8 no-underline transition-colors duration-120 hover:bg-border-subtle"
		>
			<h3 class="mb-2 font-heading text-xl font-normal text-text-primary">Tvättstuga</h3>
			<p class="text-sm text-text-secondary">Boka en tid i tvättstugan.</p>
		</a>
		<a
			href={resolve('/uteplats')}
			class="block bg-bg-alt p-8 no-underline transition-colors duration-120 hover:bg-border-subtle"
		>
			<h3 class="mb-2 font-heading text-xl font-normal text-text-primary">Uteplats</h3>
			<p class="text-sm text-text-secondary">Boka den gemensamma uteplatsen.</p>
		</a>
		<a
			href={resolve('/information')}
			class="block bg-bg-alt p-8 no-underline transition-colors duration-120 hover:bg-border-subtle"
		>
			<h3 class="mb-2 font-heading text-xl font-normal text-text-primary">Information</h3>
			<p class="text-sm text-text-secondary">Stadgar, ekonomi, styrelsen och mer.</p>
		</a>
		<a
			href={resolve('/kontakt')}
			class="block bg-bg-alt p-8 no-underline transition-colors duration-120 hover:bg-border-subtle"
		>
			<h3 class="mb-2 font-heading text-xl font-normal text-text-primary">Kontakt</h3>
			<p class="text-sm text-text-secondary">Nå styrelsen.</p>
		</a>
	</div>
</section>

<!-- Contact -->
<section class="mx-auto mb-16 max-w-170">
	<h2 class="mb-6 font-heading text-xl font-normal">Kontakt</h2>
	<p class="text-text-secondary">
		Har du frågor? Kontakta styrelsen på
		<a href="mailto:brfskiftesgatan@gmail.com">brfskiftesgatan@gmail.com</a>.
	</p>
	<a href={resolve('/kontakt')} class="mt-4 inline-block text-sm">Alla kontaktuppgifter</a>
</section>
