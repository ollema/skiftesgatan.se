<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults, canonical } from '$lib/meta';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getContactInfo } from '$lib/api/contact.remote';

	let contact = $derived(await getContactInfo());
</script>

<MetaTags
	{...metaDefaults}
	title="Kontakt"
	description="Kontakta styrelsen för BRF Skiftesgatan 4."
	canonical={canonical(page.url)}
/>

<h1 class="mb-6 font-heading text-2xl font-normal">Kontakt</h1>

<div class="max-w-170">
	<section class="mb-8">
		<h3 class="mb-4 font-heading text-xl font-normal">Styrelsen</h3>
		<p class="text-text-secondary">
			För allmänna frågor, kontakta styrelsen på
			<a href="mailto:styrelsen@skiftesgatan.se">styrelsen@skiftesgatan.se</a>.
		</p>
	</section>

	<section class="mb-8">
		<h3 class="mb-4 font-heading text-xl font-normal">Förvaltare</h3>
		{#if contact}
			{#if contact.manager.name}
				<p class="mb-1 text-text-secondary">{contact.manager.name}</p>
			{/if}
			{#if contact.manager.phone}
				<p class="mb-1 text-text-secondary">
					Telefon: <a href="tel:{contact.manager.phone.replace(/[^+\d]/g, '')}"
						>{contact.manager.phone}</a
					>
				</p>
			{/if}
			{#if contact.manager.email}
				<p class="text-text-secondary">
					E-post: <a href="mailto:{contact.manager.email}">{contact.manager.email}</a>
				</p>
			{/if}
		{:else}
			<p class="text-text-muted">
				<a href={resolve('/konto/login')}>Logga in</a> för att se kontaktuppgifter.
			</p>
		{/if}
	</section>
</div>
