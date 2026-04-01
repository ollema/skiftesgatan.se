<script lang="ts">
	import BookingPage from '$lib/components/BookingPage.svelte';
	import type { BookingPageLabels } from '$lib/components/BookingPage.svelte';

	const labels: BookingPageLabels = {
		title: 'Uteplats',
		hasBooking: 'Du har bokat uteplatsen',
		noBooking: 'Du har inte bokat uteplatsen.',
		toastBooked: 'Uteplats bokad',
		toastCancelled: 'Uteplats avbokad',
		cancelDescription: 'Din bokade uteplats kommer att frigöras.'
	};
</script>

<BookingPage resource="outdoor_area" slotCount={1} gridClass="grid grid-cols-1 gap-2" {labels} />
