<script lang="ts">
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
</script>

<BookingPage resource="laundry_room" slotCount={5} gridClass="grid grid-cols-5 gap-2" {labels} />
