<script lang="ts">
	import { Collapsible } from 'bits-ui';
	import { allPages } from 'content-collections';
	import BookingPage from '$lib/components/BookingPage.svelte';
	import type { BookingPageLabels } from '$lib/components/BookingPage.svelte';

	const labels: BookingPageLabels = {
		title: 'Tvättstuga',
		hasBooking: 'Du har bokat en tvättid',
		noBooking: 'Du har inte bokat någon tvättid.',
		toastBooked: 'Tvättid bokad',
		toastCancelled: 'Tvättid avbokad',
		cancelDescription: 'Din bokade tvättid kommer att frigöras.'
	};

	const info = allPages.find((p) => p._meta.path === 'laundry/about');
</script>

<BookingPage resource="laundry_room" slotCount={5} gridClass="grid grid-cols-5 gap-2" {labels} />

{#if info}
	<Collapsible.Root class="mt-6">
		<Collapsible.Trigger
			class="group inline-flex items-center gap-2 text-sm tracking-widest text-text-secondary transition-colors duration-120 hover:text-accent data-[state=open]:text-accent"
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
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- build-time compiled markdown -->
			<div class="prose mt-2 max-w-170">{@html info.html}</div>
		</Collapsible.Content>
	</Collapsible.Root>
{/if}
