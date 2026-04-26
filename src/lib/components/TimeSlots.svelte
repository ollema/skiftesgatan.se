<script lang="ts">
	import { CalendarDate } from '@internationalized/date';
	import { toast } from 'svelte-sonner';
	import { getBookingData, book, cancelBooking } from '$lib/api/booking.remote';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { type BookingTimeSlot, type Resource } from '$lib/types/bookings';
	import { formatDate, formatHourNumShort } from '$lib/utils/date';

	interface Props {
		resource: Resource;
		date: CalendarDate;
		timeslots: BookingTimeSlot[];
		activeBooking: BookingTimeSlot | undefined;
	}

	let { resource, date, timeslots, activeBooking }: Props = $props();

	// load data
	let user = $derived(await getOptionalUser());

	// state
	let error = $state('');
	let cancelBookingId = $state<number | null>(null);
	let pendingBooking = $state<{
		timeslotId: number;
		replaceBookingId: number;
		replaceDescription: string;
	} | null>(null);
	let showLoginDialog = $state(false);
</script>

<div class="grid grid-cols-5 gap-2">
	{#each timeslots as slot (slot.timeslotId)}
		{@const timeRange = `${formatHourNumShort(slot.start)}–${formatHourNumShort(slot.end)}`}
		{#if slot.status === 'free'}
			<button
				data-slot-status="free"
				aria-label={activeBooking
					? `Ledig tid ${timeRange}, ersätt din bokning`
					: `Ledig tid ${timeRange}, boka`}
				class="cursor-pointer rounded-sm border border-border px-2 py-1.5 text-center text-xs whitespace-nowrap text-text-primary transition-colors duration-120 hover:bg-bg-alt sm:text-sm"
				onclick={async () => {
					if (!user) {
						showLoginDialog = true;
						return;
					}
					error = '';
					if (activeBooking) {
						pendingBooking = {
							timeslotId: slot.timeslotId,
							replaceBookingId: activeBooking.bookingId!,
							replaceDescription: `${formatDate(activeBooking.date)}, ${formatHourNumShort(activeBooking.start)}–${formatHourNumShort(activeBooking.end)}`
						};
						return;
					}
					try {
						await book({ timeslotId: slot.timeslotId, resource, date });
						toast.success('Bokning lyckades!');
					} catch (e) {
						error = e instanceof Error ? e.message : String(e);
					}
				}}
			>
				{formatHourNumShort(slot.start)}&ndash;{formatHourNumShort(slot.end)}
			</button>
		{:else if slot.status === 'mine'}
			<button
				data-slot-status="mine"
				aria-label={`Din bokning ${timeRange}, avboka`}
				class="cursor-pointer rounded-sm bg-slot-mine px-2 py-1.5 text-center text-xs whitespace-nowrap text-surface transition-colors duration-120 hover:opacity-90 sm:text-sm"
				onclick={() => {
					cancelBookingId = slot.bookingId;
				}}
			>
				{slot.username}
			</button>
		{:else}
			<button
				data-slot-status="booked"
				aria-label={`Bokad av ${slot.username}, ${timeRange}`}
				class="cursor-not-allowed rounded-sm bg-slot-occupied px-2 py-1.5 text-center text-xs whitespace-nowrap text-surface sm:text-sm"
				disabled
			>
				{slot.username}
			</button>
		{/if}
	{/each}
</div>

<p class="mt-3 text-error empty:hidden" aria-live="polite" data-testid="booking-error">
	{error}
</p>

{#if user}
	<ConfirmDialog
		open={cancelBookingId !== null}
		onClose={() => (cancelBookingId = null)}
		title="Avboka?"
		description="Din nuvarande bokning kommer att avbokas."
		onConfirm={async () => {
			if (cancelBookingId === null) return;
			error = '';
			try {
				await cancelBooking({ bookingId: cancelBookingId }).updates(getBookingData({ resource }));
				toast.success('Bokning avbokad!');
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
				toast.success('Bokat!');
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
