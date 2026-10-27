<script lang="ts">
	import SetupHints from '#lib/components/SetupHints.svelte';
	import Calendar from '#lib/components/Calendar.svelte';
	import Slots from '#lib/components/Slots.svelte';
	import { getOptionalUser } from '#lib/api/auth.remote.js';
	import { getSetupHints } from '#lib/api/hints.remote.js';
	import { getBookingData } from '#lib/api/booking.remote.js';
	import { TIMEZONE, type Resource } from '#lib/types/bookings.js';
	import { formatDate, formatDateRange, formatHourNum } from '#lib/utils/date.js';
	import { parseDate, today } from '@internationalized/date';
	const todayDate = today(TIMEZONE);

	const minDate = todayDate;
	const maxDate = todayDate.add({ months: 1 });

	let { resource }: { resource: Resource } = $props();

	// load data
	let user = $derived(await getOptionalUser());
	let hints = $derived(await getSetupHints());
	let live = $derived(getBookingData({ resource }));
	let data = $derived(await live);

	// calendar state
	let date = $state(minDate);

	// derived state/data
	let laundryRoom = $derived(resource === 'laundry_room');
	let plural = $derived(user?.name?.includes('&') ?? false);
	let bookingCalendar = $derived(data.bookingCalendar);
	let closedDays = $derived(data.closedDays);
	let closures = $derived(data.closures);
	let activeBooking = $derived(data.activeBooking);
	let slots = $derived(bookingCalendar[date.toString()] ?? []);

	function closureLabel(closure: {
		startDate: string;
		endDate: string;
		reason: string | null;
	}): string {
		const range = formatDateRange(parseDate(closure.startDate), parseDate(closure.endDate));
		return closure.reason ? `${range} (${closure.reason})` : range;
	}

	// derived text
	let title = $derived(laundryRoom ? 'Tvättstuga' : 'Uteplats');
	let greeting = $derived.by(() => {
		if (!user) return 'Hej!';
		if (plural) return `Hej ${user.name}!`;
		return `Hej ${user.name.split('&')[0]}!`;
	});
	let message = $derived.by(() => {
		if (!user) return 'Du måste logga in för att boka en tid.';
		if (activeBooking) {
			return `Du har bokat ${laundryRoom ? 'tvättstugan' : 'uteplatsen'} ${formatDate(activeBooking.date)}, ${formatHourNum(activeBooking.start)}–${formatHourNum(activeBooking.end)}.`;
		}
		return `Du har inte bokat ${laundryRoom ? 'någon tvättid' : 'uteplatsen'}.`;
	});
</script>

<!-- title, greeting and message -->
<h1 class="mb-4 font-heading text-2xl font-normal">{title}</h1>
<p class="mb-2 text-text-secondary">{greeting}</p>
<p class="text-text-secondary">{message}</p>

<!-- setup hints -->
{#if user}
	<SetupHints showReminderHint={hints.showReminderHint} showCalendarHint={hints.showCalendarHint} />
{/if}

<!-- calendar -->
<div>
	<Calendar bind:date minValue={minDate} maxValue={maxDate} {bookingCalendar} {closedDays} />
</div>

{#if closures.length > 0}
	<div class="mt-3 flex flex-col gap-1 text-sm text-text-secondary">
		{#each closures as closure (`${closure.startDate}-${closure.endDate}-${closure.reason}`)}
			<p>Stängt för underhåll: {closureLabel(closure)}</p>
		{/each}
	</div>
{/if}

<div class="mt-8 mb-3 flex flex-col-reverse gap-1 sm:flex-row sm:items-baseline sm:justify-between">
	<h2 class="font-heading text-lg font-normal">
		{formatDate(date)}
	</h2>
	{#if !live.connected}
		<p class="text-xs text-text-muted" data-testid="live-disconnected">
			Frånkopplad —
			<button
				class="cursor-pointer text-text-muted underline decoration-1 underline-offset-2"
				onclick={() => live.reconnect()}>försök igen</button
			>
		</p>
	{/if}
</div>

<!-- time slots -->
<Slots {resource} {date} {slots} {activeBooking} />
