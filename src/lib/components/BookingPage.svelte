<script module lang="ts">
	export interface BookingPageLabels {
		title: string;
		hasBooking: string;
		noBooking: string;
		toastBooked: string;
		toastCancelled: string;
		cancelDescription: string;
	}
</script>

<script lang="ts">
	import { today, CalendarDate, CalendarDateTime, DateFormatter } from '@internationalized/date';
	import { toast } from 'svelte-sonner';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import { getSlots, getUpcomingSlots, book, cancelBooking } from '$lib/api/booking.remote';
	import { getSetupHints } from '$lib/api/hints.remote';
	import Calendar from '$lib/components/Calendar.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import SetupHints from '$lib/components/SetupHints.svelte';
	import type { DotsByDate, SlotStatus } from '$lib/components/Calendar.svelte';
	import { TIMEZONE, type Resource } from '$lib/types/bookings';

	interface Props {
		resource: Resource;
		slotCount: number;
		gridClass: string;
		labels: BookingPageLabels;
	}

	let { resource, slotCount, gridClass, labels }: Props = $props();

	const minDate = today(TIMEZONE);
	const maxDate = today(TIMEZONE).add({ months: 1 });
	let date = $state(today(TIMEZONE));
	let error = $state('');
	let cancelBookingId = $state<number | null>(null);
	let pendingBooking = $state<{
		timeslotId: number;
		replaceBookingId: number;
		replaceDescription: string;
	} | null>(null);
	let showLoginDialog = $state(false);

	const dateFormatter = new DateFormatter('sv-SE', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: TIMEZONE
	});
	const hourFormatter = new DateFormatter('sv-SE', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: TIMEZONE
	});

	function formatDate(d: CalendarDate | CalendarDateTime) {
		return dateFormatter.format(d.toDate(TIMEZONE));
	}

	function formatHour(d: CalendarDateTime) {
		return hourFormatter.format(d.toDate(TIMEZONE));
	}

	function buildDots(
		monthBookings: Array<{ timeslotId: number; start: CalendarDateTime; userId: string | null }>,
		currentUserId: string,
		timeslotIds: number[]
	): DotsByDate {
		const result: DotsByDate = {};
		const byDate: Record<string, Record<number, string | null>> = {};
		for (const b of monthBookings) {
			const dateKey = new CalendarDate(b.start.year, b.start.month, b.start.day).toString();
			if (!byDate[dateKey]) byDate[dateKey] = {};
			byDate[dateKey][b.timeslotId] = b.userId;
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
		{@const fetchedAt = slotsData.fetchedAt}
		{@const upcomingBookings = await getUpcomingSlots({ resource })}
		{@const timeslotIds = slots.map((s) => s.id)}
		{@const dots = buildDots(upcomingBookings, user?.id ?? '', timeslotIds)}
		{@const myBooking = user ? upcomingBookings.find((b) => b.userId === user.id) : undefined}
		{@const hints = await getSetupHints()}

		<h1 class="font-heading text-2xl font-normal">{labels.title}</h1>
		{#if user}
			<p class="mt-2 text-text-secondary">Hej, {user.name}!</p>
		{/if}
		{#if myBooking}
			<p class="mt-2 text-text-secondary">
				{labels.hasBooking}
				{formatDate(myBooking.start)}, {formatHour(myBooking.start)}&ndash;{formatHour(
					myBooking.end
				)}.
			</p>
		{:else if user}
			<p class="mt-2 text-text-muted">{labels.noBooking}</p>
		{/if}

		{#if user}
			<SetupHints
				showNotificationHint={hints.showNotificationHint}
				showCalendarHint={hints.showCalendarHint}
			/>
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
				Uppdaterades {fetchedAt.toString()}.
				<button
					class="text-text-muted underline decoration-1 underline-offset-2"
					onclick={async () => {
						await getSlots({ date, resource }).refresh();
						await getUpcomingSlots({ resource }).refresh();
					}}>Uppdatera manuellt</button
				>
			</p>
		</div>

		<div class={gridClass}>
			{#each slots as slot (slot.id)}
				{#if slot.bookingId === null}
					<button
						data-slot-status="free"
						class="rounded-sm border border-border px-2 py-1.5 text-center text-xs whitespace-nowrap text-text-primary transition-colors duration-120 hover:bg-bg-alt sm:text-sm"
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
									replaceDescription: `${formatDate(existing.start)}, ${formatHour(existing.start)}–${formatHour(existing.end)}`
								};
								return;
							}
							try {
								await book({ timeslotId: slot.id, resource, date });
								toast.success(labels.toastBooked);
							} catch (e) {
								error = e instanceof Error ? e.message : String(e);
							}
						}}
					>
						{slot.start.hour}&ndash;{slot.end.hour}
					</button>
				{:else if user && slot.userId === user.id}
					<button
						data-slot-status="mine"
						class="rounded-sm bg-slot-mine px-2 py-1.5 text-center text-xs whitespace-nowrap text-surface transition-colors duration-120 hover:opacity-90 sm:text-sm"
						onclick={() => {
							cancelBookingId = slot.bookingId;
						}}
					>
						{slot.username}
					</button>
				{:else}
					<button
						data-slot-status="booked"
						class="cursor-not-allowed rounded-sm bg-slot-occupied px-2 py-1.5 text-center text-xs whitespace-nowrap text-surface sm:text-sm"
						disabled
					>
						{slot.username}
					</button>
				{/if}
			{/each}
		</div>

		{#if user}
			<ConfirmDialog
				open={cancelBookingId !== null}
				onClose={() => (cancelBookingId = null)}
				title="Avboka?"
				description={labels.cancelDescription}
				onConfirm={async () => {
					if (cancelBookingId === null) return;
					error = '';
					try {
						await cancelBooking({ bookingId: cancelBookingId }).updates(
							getSlots({ date, resource }),
							getUpcomingSlots({ resource })
						);
						toast.success(labels.toastCancelled);
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
				description="Du har redan en bokning {pendingBooking?.replaceDescription}. Den avbokas och ersätts med den nya tiden."
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
						toast.success(labels.toastBooked);
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
				window.location.href = '/konto/login';
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
