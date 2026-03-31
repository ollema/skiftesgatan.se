<script lang="ts">
	import { today, getLocalTimeZone } from '@internationalized/date';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import { getSlots, getUpcomingSlots, book, cancelBooking } from '$lib/api/booking.remote';
	import Calendar from '$lib/components/Calendar.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { DotsByDate, SlotStatus } from '$lib/components/Calendar.svelte';

	const resource = 'laundry_room' as const;
	const slotCount = 5;
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

	function formatDate(d: string) {
		return new Date(d + 'T00:00').toLocaleDateString('sv-SE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

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

	<svelte:boundary>
		{@const slotsData = await getSlots({ date, resource })}
		{@const slots = slotsData.slots}
		{@const fetchedAt = new Date(slotsData.fetchedAt)}
		{@const upcomingBookings = await getUpcomingSlots({ resource })}
		{@const timeslotIds = slots.map((s) => s.id)}
		{@const dots = buildDots(upcomingBookings, user?.id ?? '', timeslotIds)}
		{@const myBooking = user ? upcomingBookings.find((b) => b.userId === user.id) : undefined}

		<h1 class="font-heading text-2xl font-normal">Tvättstuga</h1>
		{#if user}
			<p class="mt-2 text-text-secondary">Hej boende i {user.name}!</p>
		{/if}
		{#if myBooking}
			<p class="mt-2 text-text-secondary">
				Du har bokat en tvättid {formatDate(myBooking.date)}, {String(myBooking.startHour).padStart(
					2,
					'0'
				)}:00&ndash;{String(myBooking.endHour).padStart(2, '0')}:00.
			</p>
		{:else if user}
			<p class="mt-2 text-text-muted">Du har inte bokat någon tvättid.</p>
		{/if}

		<div>
			<Calendar bind:date minValue={minDate} maxValue={maxDate} {dots} {slotCount} />
		</div>

		{#if error}
			<p class="mt-3 text-error" data-testid="booking-error">{error}</p>
		{/if}

		<div
			class="mt-8 mb-3 flex flex-col-reverse gap-1 sm:flex-row sm:items-baseline sm:justify-between"
		>
			<h2 class="font-heading text-lg font-normal">
				{formatDate(date)}
			</h2>
			<p class="text-xs text-text-muted">
				Uppdaterades {fetchedAt.toLocaleTimeString('sv-SE', {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				})}.
				<button
					class="text-text-muted underline decoration-1 underline-offset-2"
					onclick={async () => {
						await getSlots({ date, resource }).refresh();
						await getUpcomingSlots({ resource }).refresh();
					}}>Uppdatera manuellt</button
				>
			</p>
		</div>

		<div class="grid grid-cols-5 gap-2">
			{#each slots as slot (slot.id)}
				{#if slot.bookingId === null}
					<button
						data-slot-status="free"
						class="rounded-[3px] border border-border px-2 py-1.5 text-center text-xs whitespace-nowrap text-text-primary transition-colors duration-[120ms] hover:bg-bg-alt sm:text-sm"
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
						{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(2, '0')}
					</button>
				{:else if user && slot.userId === user.id}
					<button
						data-slot-status="mine"
						class="rounded-[3px] bg-slot-mine px-2 py-1.5 text-center text-xs whitespace-nowrap text-surface transition-colors duration-[120ms] hover:opacity-90 sm:text-sm"
						onclick={() => {
							cancelBookingId = slot.bookingId;
						}}
					>
						{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(2, '0')}
					</button>
				{:else}
					<button
						data-slot-status="booked"
						class="cursor-not-allowed rounded-[3px] bg-slot-occupied px-2 py-1.5 text-center text-xs whitespace-nowrap text-surface sm:text-sm"
						disabled
					>
						{String(slot.startHour).padStart(2, '0')}&ndash;{String(slot.endHour).padStart(2, '0')}
					</button>
				{/if}
			{/each}
		</div>

		{#if user}
			<ConfirmDialog
				open={cancelBookingId !== null}
				onClose={() => (cancelBookingId = null)}
				title="Avboka?"
				description="Din bokade tvättid kommer att frigöras."
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
				title="Ersätt din bokning?"
				description="Du har redan en bokning den {pendingBooking?.replaceDate}. Den avbokas och ersätts med den nya tiden."
				confirmLabel="Ersätt"
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
			title="Inloggning krävs"
			description="Du måste logga in för att boka en tid."
			confirmLabel="Logga in"
			confirmClass="bg-accent hover:bg-accent-hover"
			onConfirm={() => {
				window.location.href = '/auth/login';
			}}
		/>

		{#snippet pending()}
			<p class="mt-6 text-text-secondary">Laddar tider...</p>
		{/snippet}

		{#snippet failed(err)}
			<p class="mt-3 text-error">Kunde inte ladda tider: {String(err)}</p>
		{/snippet}
	</svelte:boundary>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>
