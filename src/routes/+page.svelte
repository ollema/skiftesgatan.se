<script lang="ts">
	import { allNews } from 'content-collections';
	import { resolve } from '$app/paths';
	import { parseDate, DateFormatter, getLocalTimeZone } from '@internationalized/date';

	const latestNews = allNews
		.toSorted((a, b) => parseDate(b.date).compare(parseDate(a.date)))
		.slice(0, 3);

	const df = new DateFormatter('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
	const tz = getLocalTimeZone();
</script>

<!-- Hero -->
<section class="pt-16 pb-24 text-center lg:pt-24 lg:pb-32">
	<p class="mb-4 text-xs tracking-widest text-text-muted uppercase">Bostadsrättsförening</p>
	<h1 class="mb-6 font-heading text-3xl font-normal lg:text-[2.75rem] lg:leading-tight">
		Skiftesgatan
	</h1>
	<p class="mx-auto max-w-120 text-lg leading-relaxed text-text-secondary">
		24 lägenheter i fyra våningar, byggda 1965. Ett välskött hem i Göteborg.
	</p>
</section>

<!-- About -->
<section class="mx-auto max-w-170 pb-24 lg:pb-32">
	<h2 class="mb-6 font-heading text-xl font-normal">Om föreningen</h2>
	<p class="leading-loose text-text-secondary">
		Skiftesgatan är en bostadsrättsförening belägen i Göteborg. Byggnaden uppfördes 1965 och består
		av 24 lägenheter fördelade på fyra våningar. Föreningen förvaltas av en vald styrelse och alla
		boende är medlemmar med lika rösträtt vid årsstämman.
	</p>
	<a href={resolve('/information/om')} class="mt-4 inline-block text-sm"> Läs mer om föreningen </a>
</section>

<!-- Latest News -->
<section class="mx-auto max-w-170 pb-24 lg:pb-32">
	<h2 class="mb-10 font-heading text-xl font-normal">Nyheter</h2>
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
					{df.format(parseDate(item.date).toDate(tz))}
				</time>
				<h3 class="mb-2 font-heading text-xl font-normal text-text-primary">{item.title}</h3>
				<p class="text-sm text-text-secondary">{item.summary}</p>
			</a>
		{/each}
	</div>
	<a href={resolve('/nyheter')} class="mt-6 inline-block text-sm">Alla nyheter</a>
</section>

<!-- Resident Services -->
<section class="pb-24 lg:pb-32">
	<h2 class="mb-10 font-heading text-xl font-normal">För boende</h2>
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
			<p class="text-sm text-text-secondary">Nå styrelsen eller fastighetsförvaltaren.</p>
		</a>
	</div>
</section>

<!-- Contact -->
<section class="mx-auto max-w-170 pb-16 lg:pb-24">
	<h2 class="mb-6 font-heading text-xl font-normal">Kontakt</h2>
	<p class="text-text-secondary">
		Har du frågor? Kontakta styrelsen på
		<a href="mailto:styrelsen@skiftesgatan.se">styrelsen@skiftesgatan.se</a>.
	</p>
	<a href={resolve('/kontakt')} class="mt-4 inline-block text-sm">Alla kontaktuppgifter</a>
</section>
