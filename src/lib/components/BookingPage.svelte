<script lang="ts">
	import SetupHints from '$lib/components/SetupHints.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import TimeSlots from '$lib/components/TimeSlots.svelte';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import { getSetupHints } from '$lib/api/hints.remote';
	import { getBookingData } from '$lib/api/booking.remote';
	import { TIMEZONE, type Resource } from '$lib/types/bookings';
	import { formatDate, formatHourNum } from '$lib/utils/date';
	import { today } from '@internationalized/date';
	// TODO: will this cause a bug if the user leaves the page open past midnight?
	// maybe we should also update the date at midnight?
	const todayDate = today(TIMEZONE);

	const minDate = todayDate;
	const maxDate = todayDate.add({ months: 1 });

	let { resource }: { resource: Resource } = $props();

	// load data
	let user = $derived(await getOptionalUser());
	let hints = $derived(await getSetupHints());
	let data = $derived(await getBookingData({ resource }));

	// calendar state
	let date = $state(minDate);

	// derived state/data
	let laundryRoom = $derived(resource === 'laundry_room');
	let plural = $derived(user?.name?.includes('&') ?? false);
	let slotCount = $derived(laundryRoom ? 5 : 1);
	let bookingCalendar = $derived(data.bookingCalendar);
	let activeBooking = $derived(data.activeBooking);
	let timeslots = $derived(bookingCalendar[date.toString()] ?? []);

	// TODO: replace polling with SSE once $derived(await ...) + .refresh() is stable
	// poll for booking changes and refresh when the page becomes visible after being hidden
	$effect(() => {
		let lastHidden = 0;

		function onVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				lastHidden = Date.now();
			}
			if (document.visibilityState === 'visible' && Date.now() - lastHidden > 5_000) {
				getBookingData({ resource }).refresh();
			}
		}

		const interval = setInterval(() => {
			getBookingData({ resource }).refresh();
		}, 10_000);

		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});

	async function refreshNow() {
		await getBookingData({ resource }).refresh();
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
	<SetupHints
		showNotificationHint={hints.showNotificationHint}
		showCalendarHint={hints.showCalendarHint}
	/>
{/if}

<!-- calendar -->
<div>
	<Calendar bind:date minValue={minDate} maxValue={maxDate} {slotCount} {bookingCalendar} />
</div>

<div class="mt-8 mb-3 flex flex-col-reverse gap-1 sm:flex-row sm:items-baseline sm:justify-between">
	<h2 class="font-heading text-lg font-normal">
		{formatDate(date)}
	</h2>
	<p class="text-xs text-text-muted">
		Uppdaterades {data.fetchedAt.toString()}.
		<button
			class="cursor-pointer text-text-muted underline decoration-1 underline-offset-2"
			onclick={refreshNow}>Uppdatera nu</button
		>
	</p>
</div>

<!-- time slots -->
<TimeSlots {resource} {date} {timeslots} {activeBooking} />
