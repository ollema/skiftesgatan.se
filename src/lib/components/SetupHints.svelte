<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		showReminderHint,
		showCalendarHint
	}: { showReminderHint: boolean; showCalendarHint: boolean } = $props();

	let reminderDismissed = $state(false);
	let calendarDismissed = $state(false);

	let reminderVisible = $derived(showReminderHint && !reminderDismissed);
	let calendarVisible = $derived(showCalendarHint && !calendarDismissed);
	let anyVisible = $derived(reminderVisible || calendarVisible);

	function dismissReminder() {
		document.cookie = 'dismiss_hint_reminders=1; path=/; SameSite=Lax; max-age=2592000';
		reminderDismissed = true;
	}

	function dismissCalendar() {
		document.cookie = 'dismiss_hint_calendar=1; path=/; SameSite=Lax; max-age=2592000';
		calendarDismissed = true;
	}

	function dismissAll() {
		document.cookie = 'dismiss_hint_reminders=1; path=/; SameSite=Lax; max-age=315360000';
		document.cookie = 'dismiss_hint_calendar=1; path=/; SameSite=Lax; max-age=315360000';
		reminderDismissed = true;
		calendarDismissed = true;
	}
</script>

{#if anyVisible}
	<div class="mt-4 mb-2 flex flex-col gap-2">
		{#if reminderVisible}
			<div
				class="flex items-start justify-between rounded-sm border border-border-subtle px-4 py-3"
			>
				<p class="text-sm text-text-secondary">
					Aktivera <a
						href={resolve('/konto')}
						class="text-link underline decoration-1 underline-offset-2 hover:text-link-hover"
						>e-postaviseringar</a
					> för att få en påminnelse innan din bokning.
				</p>
				<button
					onclick={dismissReminder}
					class="ml-3 shrink-0 cursor-pointer text-base text-text-muted hover:text-text-secondary"
					aria-label="Stäng tips">&#215;</button
				>
			</div>
		{/if}
		{#if calendarVisible}
			<div
				class="flex items-start justify-between rounded-sm border border-border-subtle px-4 py-3"
			>
				<p class="text-sm text-text-secondary">
					<a
						href={resolve('/konto')}
						class="text-link underline decoration-1 underline-offset-2 hover:text-link-hover"
						>Prenumerera på dina bokningar</a
					> i din kalenderapp.
				</p>
				<button
					onclick={dismissCalendar}
					class="ml-3 shrink-0 cursor-pointer text-base text-text-muted hover:text-text-secondary"
					aria-label="Stäng tips">&#215;</button
				>
			</div>
		{/if}
		<button
			onclick={dismissAll}
			class="mt-1 cursor-pointer self-start text-xs text-text-muted underline decoration-1 underline-offset-2"
		>
			Visa inte tips
		</button>
	</div>
{/if}
