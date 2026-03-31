<script lang="ts">
	import { today, getLocalTimeZone } from '@internationalized/date';
	import { AlertDialog } from 'bits-ui';
	import { getUser } from '$lib/api/auth.remote';
	import { getSlots, getMonthSlots, book, cancelBooking } from '$lib/api/booking.remote';
	import Calendar from '$lib/components/Calendar.svelte';
	import type { DotsByDate, SlotStatus } from '$lib/components/Calendar.svelte';

	const resource = 'laundry_room' as const;
	const slotCount = 5;
	const tz = getLocalTimeZone();
	const minDate = today(tz);
	const maxDate = today(tz).add({ days: 30 });
	let date = $state(new Date().toISOString().slice(0, 10));
	let error = $state('');
	let visibleYear = $state(new Date().getFullYear());
	let visibleMonth = $state(new Date().getMonth() + 1);
	let cancelBookingId = $state<number | null>(null);

	function handleMonthChange(year: number, month: number) {
		visibleYear = year;
		visibleMonth = month;
	}

	function buildDots(
		monthBookings: Array<{ timeslotId: number; date: string; userId: string }>,
		currentUserId: string,
		timeslotIds: number[]
	): DotsByDate {
		const result: DotsByDate = {};
		const byDate: Record<string, Record<number, string>> = {};
		for (const b of monthBookings) {
			if (!byDate[b.date]) byDate[b.date] = {};
			byDate[b.date][b.timeslotId] = b.userId;
		}
		for (const dateStr in byDate) {
			const slotMap = byDate[dateStr];
			result[dateStr] = timeslotIds.map((tid): SlotStatus => {
				const userId = slotMap[tid];
				if (!userId) return 'free';
				return userId === currentUserId ? 'mine' : 'other';
			});
		}
		return result;
	}
</script>

<svelte:boundary>
	{@const user = await getUser()}

	<h1 class="text-xl font-semibold">Laundry Room</h1>
	<p class="mt-1 text-gray-600">Hi, {user.name}!</p>

	<svelte:boundary>
		{@const slots = await getSlots({ date, resource })}
		{@const monthBookings = await getMonthSlots({
			year: visibleYear,
			month: visibleMonth,
			resource
		})}
		{@const timeslotIds = slots.map((s) => s.id)}
		{@const dots = buildDots(monthBookings, user.id, timeslotIds)}

		<div class="mt-4">
			<Calendar
				bind:date
				minValue={minDate}
				maxValue={maxDate}
				{dots}
				{slotCount}
				onMonthChange={handleMonthChange}
			/>
		</div>

		{#if error}
			<p class="mt-2 text-red-500" data-testid="booking-error">{error}</p>
		{/if}

		<div class="mt-4 grid grid-cols-5 gap-2">
			{#each slots as slot (slot.id)}
				{#if slot.bookingId === null}
					<button
						class="rounded-lg bg-slot-free p-3 text-center text-sm font-medium text-white transition hover:opacity-90"
						onclick={async () => {
							error = '';
							try {
								await book({ timeslotId: slot.id, resource, date });
							} catch (e) {
								error = e instanceof Error ? e.message : String(e);
							}
						}}
					>
						<div>
							{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(
								2,
								'0'
							)}
						</div>
						<div class="mt-1 text-xs opacity-90">Book</div>
					</button>
				{:else if slot.userId === user.id}
					<button
						class="rounded-lg bg-slot-mine p-3 text-center text-sm font-medium text-white transition hover:opacity-90"
						onclick={() => {
							cancelBookingId = slot.bookingId;
						}}
					>
						<div>
							{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(
								2,
								'0'
							)}
						</div>
						<div class="mt-1 text-xs opacity-90">Your booking</div>
					</button>
				{:else}
					<button
						class="cursor-not-allowed rounded-lg bg-slot-booked p-3 text-center text-sm font-medium text-white opacity-90"
						disabled
					>
						<div>
							{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(
								2,
								'0'
							)}
						</div>
						<div class="mt-1 text-xs opacity-90">{slot.username}</div>
					</button>
				{/if}
			{/each}
		</div>

		<AlertDialog.Root
			open={cancelBookingId !== null}
			onOpenChange={(open) => {
				if (!open) cancelBookingId = null;
			}}
		>
			<AlertDialog.Portal>
				<AlertDialog.Overlay class="fixed inset-0 z-40 bg-black/50" />

				<AlertDialog.Content
					class="fixed inset-0 z-50 m-auto flex h-fit max-w-sm flex-col rounded-lg bg-white p-6 shadow-lg"
				>
					<AlertDialog.Title class="mb-2 text-lg font-semibold">Cancel booking?</AlertDialog.Title>

					<AlertDialog.Description class="mb-6 text-sm text-gray-600">
						This will release your reserved time slot.
					</AlertDialog.Description>

					<div class="flex justify-end gap-3">
						<AlertDialog.Cancel
							class="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
						>
							Go back
						</AlertDialog.Cancel>

						<AlertDialog.Action
							class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
							onclick={async () => {
								if (cancelBookingId === null) return;
								error = '';
								try {
									await cancelBooking({ bookingId: cancelBookingId }).updates(
										getSlots({ date, resource }),
										getMonthSlots({ year: visibleYear, month: visibleMonth, resource })
									);
								} catch (e) {
									error = e instanceof Error ? e.message : String(e);
								}
								cancelBookingId = null;
							}}
						>
							Confirm
						</AlertDialog.Action>
					</div>
				</AlertDialog.Content>
			</AlertDialog.Portal>
		</AlertDialog.Root>

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
