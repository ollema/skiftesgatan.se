<script lang="ts">
	import { today, getLocalTimeZone } from '@internationalized/date';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import { getSlots, getUpcomingSlots, book, cancelBooking } from '$lib/api/booking.remote';
	import Calendar from '$lib/components/Calendar.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { DotsByDate, SlotStatus } from '$lib/components/Calendar.svelte';

	const resource = 'outdoor_area' as const;
	const slotCount = 1;
	const tz = getLocalTimeZone();
	const minDate = today(tz);
	const maxDate = today(tz).add({ days: 30 });
	let date = $state(new Date().toISOString().slice(0, 10));
	let error = $state('');
	let cancelBookingId = $state<number | null>(null);
	let pendingBooking = $state<{
		timeslotId: number;
		replaceBookingId: number;
		replaceDate: string;
	} | null>(null);
	let showLoginDialog = $state(false);

	function buildDots(
		monthBookings: Array<{ timeslotId: number; date: string; userId: string | null }>,
		currentUserId: string,
		timeslotIds: number[]
	): DotsByDate {
		const result: DotsByDate = {};
		const byDate: Record<string, Record<number, string | null>> = {};
		for (const b of monthBookings) {
			if (!byDate[b.date]) byDate[b.date] = {};
			byDate[b.date][b.timeslotId] = b.userId;
		}
		for (const dateStr in byDate) {
			const slotMap = byDate[dateStr];
			result[dateStr] = timeslotIds.map((tid): SlotStatus => {
				const userId = slotMap[tid];
				if (userId === undefined) return 'free';
				return userId === currentUserId ? 'mine' : 'other';
			});
		}
		return result;
	}
</script>

<svelte:boundary>
	{@const user = await getOptionalUser()}

	<h1 class="font-heading text-2xl font-normal">Outdoor Area</h1>
	{#if user}
		<p class="mt-2 text-text-secondary">Hi, {user.name}!</p>
	{/if}

	<svelte:boundary>
		{@const slots = await getSlots({ date, resource })}
		{@const upcomingBookings = await getUpcomingSlots({ resource })}
		{@const timeslotIds = slots.map((s) => s.id)}
		{@const dots = buildDots(upcomingBookings, user?.id ?? '', timeslotIds)}

		<div class="mt-6">
			<Calendar bind:date minValue={minDate} maxValue={maxDate} {dots} {slotCount} />
		</div>

		{#if error}
			<p class="mt-3 text-error" data-testid="booking-error">{error}</p>
		{/if}

		<div class="mt-6 grid grid-cols-1 gap-2">
			{#each slots as slot (slot.id)}
				{#if slot.bookingId === null}
					<button
						class="rounded-[3px] bg-slot-free p-3 text-center text-sm font-medium text-surface transition-colors duration-[120ms] hover:opacity-90"
						onclick={async () => {
							if (!user) {
								showLoginDialog = true;
								return;
							}
							error = '';
							const existing = upcomingBookings.find((b) => b.userId === user.id);
							if (existing) {
								pendingBooking = {
									timeslotId: slot.id,
									replaceBookingId: existing.bookingId,
									replaceDate: existing.date
								};
								return;
							}
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
				{:else if user && slot.userId === user.id}
					<button
						class="rounded-[3px] bg-slot-mine p-3 text-center text-sm font-medium text-surface transition-colors duration-[120ms] hover:opacity-90"
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
						class="cursor-not-allowed rounded-[3px] bg-slot-booked p-3 text-center text-sm font-medium text-surface opacity-90"
						disabled
					>
						<div>
							{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(
								2,
								'0'
							)}
						</div>
						<div class="mt-1 text-xs opacity-90">{user ? slot.username : 'Booked'}</div>
					</button>
				{/if}
			{/each}
		</div>

		{#if user}
			<ConfirmDialog
				open={cancelBookingId !== null}
				onClose={() => (cancelBookingId = null)}
				title="Cancel booking?"
				description="This will release your reserved time slot."
				onConfirm={async () => {
					if (cancelBookingId === null) return;
					error = '';
					try {
						await cancelBooking({ bookingId: cancelBookingId }).updates(
							getSlots({ date, resource }),
							getUpcomingSlots({ resource })
						);
					} catch (e) {
						error = e instanceof Error ? e.message : String(e);
					}
					cancelBookingId = null;
				}}
			/>

			<ConfirmDialog
				open={pendingBooking !== null}
				onClose={() => (pendingBooking = null)}
				title="Replace your booking?"
				description="You already have a booking on {pendingBooking?.replaceDate}. This will cancel it and book the new slot instead."
				confirmLabel="Replace"
				confirmClass="bg-accent hover:bg-accent-hover"
				onConfirm={async () => {
					if (pendingBooking === null) return;
					error = '';
					try {
						await book({
							timeslotId: pendingBooking.timeslotId,
							resource,
							date,
							replaceBookingId: pendingBooking.replaceBookingId
						});
					} catch (e) {
						error = e instanceof Error ? e.message : String(e);
					}
					pendingBooking = null;
				}}
			/>
		{/if}

		<ConfirmDialog
			open={showLoginDialog}
			onClose={() => (showLoginDialog = false)}
			title="Login required"
			description="You need to log in to book a slot."
			confirmLabel="Log in"
			confirmClass="bg-accent hover:bg-accent-hover"
			onConfirm={() => {
				window.location.href = '/auth/login';
			}}
		/>

		{#snippet pending()}
			<p class="mt-6 text-text-secondary">Loading slots...</p>
		{/snippet}

		{#snippet failed(err)}
			<p class="mt-3 text-error">Error loading slots: {String(err)}</p>
		{/snippet}
	</svelte:boundary>

	{#snippet pending()}
		<p class="text-text-secondary">Loading...</p>
	{/snippet}
</svelte:boundary>
