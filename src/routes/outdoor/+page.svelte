<script lang="ts">
	import { today, getLocalTimeZone } from '@internationalized/date';
	import { getUser } from '$lib/api/auth.remote';
	import { getSlots, book, cancelBooking } from '$lib/api/booking.remote';
	import AlertDialog from '$lib/components/AlertDialog.svelte';
	import Button from '$lib/components/Button.svelte';
	import Calendar from '$lib/components/Calendar.svelte';

	const resource = 'outdoor_area' as const;
	const tz = getLocalTimeZone();
	const minDate = today(tz);
	const maxDate = today(tz).add({ days: 30 });
	let date = $state(new Date().toISOString().slice(0, 10));
	let error = $state('');
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1>Outdoor Area</h1>
	<p>Hi, {user.name}!</p>

	<Calendar bind:date minValue={minDate} maxValue={maxDate} />

	{#if error}
		<p class="text-red-500" data-testid="booking-error">{error}</p>
	{/if}

	<svelte:boundary>
		<ul>
			{#each await getSlots({ date, resource }) as slot (slot.id)}
				<li>
					<span
						>{String(slot.startHour).padStart(2, '0')}:00 – {String(slot.endHour).padStart(
							2,
							'0'
						)}:00</span
					>
					{#if slot.bookingId === null}
						<Button
							onclick={async () => {
								error = '';
								try {
									await book({ timeslotId: slot.id, resource, date });
								} catch (e) {
									error = e instanceof Error ? e.message : String(e);
								}
							}}
						>
							Book
						</Button>
					{:else}
						<span>Booked</span>
						<AlertDialog
							title="Cancel booking?"
							description="This will release your reserved time slot."
							triggerLabel="Cancel"
							onconfirm={async () => {
								error = '';
								try {
									await cancelBooking({ bookingId: slot.bookingId! }).updates(
										getSlots({ date, resource })
									);
								} catch (e) {
									error = e instanceof Error ? e.message : String(e);
								}
							}}
						/>
					{/if}
				</li>
			{/each}
		</ul>

		{#snippet pending()}
			<p>Loading slots...</p>
		{/snippet}

		{#snippet failed(err)}
			<p class="text-red-500">Error loading slots: {String(err)}</p>
		{/snippet}
	</svelte:boundary>

	{#snippet pending()}
		<p>Loading...</p>
	{/snippet}
</svelte:boundary>
