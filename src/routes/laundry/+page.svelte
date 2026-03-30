<script lang="ts">
	import { getUser } from '$lib/api/auth.remote';
	import { getSlots, book, cancelBooking } from '$lib/api/booking.remote';

	const resource = 'laundry_room' as const;
	let date = $state(new Date().toISOString().slice(0, 10));
	let error = $state('');
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1>Laundry Room</h1>
	<p>Hi, {user.name}!</p>

	<label>
		Date
		<input type="date" bind:value={date} data-testid="date-input" />
	</label>

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
						<button
							class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
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
						</button>
					{:else}
						<span>Booked</span>
						<button
							class="rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
							onclick={async () => {
								error = '';
								try {
									await cancelBooking({ bookingId: slot.bookingId! }).updates(
										getSlots({ date, resource })
									);
								} catch (e) {
									error = e instanceof Error ? e.message : String(e);
								}
							}}
						>
							Cancel
						</button>
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
