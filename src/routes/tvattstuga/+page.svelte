<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import BookingPage from '$lib/components/BookingPage.svelte';
	import { Collapsible } from 'bits-ui';
</script>

<MetaTags
	{...metaDefaults}
	title="Tvättstuga"
	description="Boka en tid i tvättstugan."
	robots="noindex,nofollow"
/>

<BookingPage resource="laundry_room" />

<Collapsible.Root class="mt-6">
	<Collapsible.Trigger
		class="group inline-flex cursor-pointer items-center gap-2 text-sm tracking-widest text-text-secondary underline transition-colors duration-120 hover:text-text-primary data-[state=open]:text-text-primary"
	>
		Om tvättstugan
		<svg
			class="size-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</Collapsible.Trigger>
	<Collapsible.Content>
		<div class="prose mt-2 max-w-170">
			<p>Tvättstugan har två tvättmaskiner och är öppen mellan 07:00 och 22:00.</p>
			<p>Det finns fem tvättpass per dag: 07–10, 10–13, 13–16, 16–19 och 19–22.</p>
			<ul>
				<li>
					Du har tillgång till torktumlare och torkskåp 30 minuter efter ditt bokade tvättpass.
				</li>
				<li>Ta bort ludd från torktumlaren efter användning.</li>
				<li>Se gärna över att tvättstugan ser städad ut efter ditt pass.</li>
				<li>
					Glöm inte att dubbelkolla att ingen tvätt blir kvar. Kvarglömd tvätt som inte hämtas inom
					en vecka skänks bort.
				</li>
				<li>Vi rekommenderar flytande tvättmedel — det är skonsammare för maskinerna.</li>
			</ul>
			<p>Vid problem, gör en felanmälan och skriv i Facebook-gruppen att felanmälan är gjord.</p>
		</div>
	</Collapsible.Content>
</Collapsible.Root>
