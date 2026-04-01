<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { getUser, signout, changeName, changeEmail, changePassword } from '$lib/api/auth.remote';
	import { getCalendarUrl, regenerateCalendarUrl } from '$lib/api/calendar.remote';
	import { getPreferences, togglePreference } from '$lib/api/notification.remote';
	import Button from '$lib/components/Button.svelte';
	import type { Resource } from '$lib/types/bookings';

	let regeneratedCalendarUrl = $state('');

	async function handleCopyCalendarUrl(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			toast.success('Länk kopierad');
		} catch {
			toast.error('Kunde inte kopiera länken');
		}
	}

	async function handleRegenerateCalendarUrl() {
		if (!window.confirm('Den gamla länken slutar fungera. Vill du skapa en ny?')) return;
		try {
			regeneratedCalendarUrl = await regenerateCalendarUrl();
			toast.success('Ny länk skapad');
		} catch {
			toast.error('Kunde inte skapa ny länk');
		}
	}

	function isEnabled(
		preferences: Awaited<ReturnType<typeof getPreferences>>,
		resource: Resource,
		offsetMinutes: number
	): boolean {
		return preferences.some(
			(p) => p.resource === resource && p.offsetMinutes === offsetMinutes && p.enabled
		);
	}

	async function handleToggle(
		event: Event & { currentTarget: HTMLInputElement },
		resource: Resource,
		offsetMinutes: 60 | 1440
	) {
		const enabled = event.currentTarget.checked;
		try {
			await togglePreference({ resource, offsetMinutes, enabled });
			toast.success(enabled ? 'Avisering aktiverad' : 'Avisering inaktiverad');
		} catch {
			event.currentTarget.checked = !enabled;
			toast.error('Kunde inte uppdatera avisering');
		}
	}
</script>

<svelte:boundary>
	{@const user = await getUser()}
	{@const preferences = await getPreferences()}
	{@const initialCalendarUrl = await getCalendarUrl()}
	{@const calendarUrl = regeneratedCalendarUrl || initialCalendarUrl}
	<h1 class="mb-2 font-heading text-2xl font-normal">Mitt konto</h1>
	<p class="mb-12 text-lg text-text-secondary">Hej, {user.name}.</p>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">Visningsnamn</h2>
		<p class="mb-6 text-text-primary">{user.name}</p>
		<form
			{...changeName.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					toast.success('Namn uppdaterat');
				} catch {
					toast.error('Kunde inte byta namn');
				}
			})}
			class="flex flex-col gap-4"
		>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nytt visningsnamn
				<input {...changeName.fields.name.as('text')} class="input-field" />
			</label>
			<Button>Byt namn</Button>
			{#each changeName.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</section>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">E-post</h2>
		<p class="mb-6 text-text-primary">{user.email}</p>
		<form
			{...changeEmail.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					toast.success('Verifieringsmail skickat');
				} catch {
					toast.error('Kunde inte byta e-post');
				}
			})}
			class="flex flex-col gap-4"
		>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Ny e-post
				<input {...changeEmail.fields.email.as('email')} class="input-field" />
			</label>
			<Button>Byt e-post</Button>
			{#each changeEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</section>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">Lösenord</h2>
		<form
			{...changePassword.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					toast.success('Lösenordet ändrat');
				} catch {
					toast.error('Kunde inte byta lösenord');
				}
			})}
			class="flex flex-col gap-4"
		>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nuvarande lösenord
				<input {...changePassword.fields._currentPassword.as('password')} class="input-field" />
			</label>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nytt lösenord
				<input {...changePassword.fields._newPassword.as('password')} class="input-field" />
			</label>
			<Button>Byt lösenord</Button>
			{#each changePassword.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</section>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">Aviseringar</h2>
		<p class="mb-6 text-text-secondary">Få en påminnelse via e-post innan din bokning.</p>

		<fieldset class="mb-6">
			<legend class="mb-3 text-sm font-medium text-text-primary">Tvättstuga</legend>
			<div class="flex flex-col gap-3">
				<label class="flex items-center gap-2 text-sm text-text-secondary">
					<input
						type="checkbox"
						class="accent-accent"
						checked={isEnabled(preferences, 'laundry_room', 1440)}
						onchange={(e) => handleToggle(e, 'laundry_room', 1440)}
					/>
					24 timmar före
				</label>
				<label class="flex items-center gap-2 text-sm text-text-secondary">
					<input
						type="checkbox"
						class="accent-accent"
						checked={isEnabled(preferences, 'laundry_room', 60)}
						onchange={(e) => handleToggle(e, 'laundry_room', 60)}
					/>
					1 timme före
				</label>
			</div>
		</fieldset>

		<fieldset>
			<legend class="mb-3 text-sm font-medium text-text-primary">Uteplats</legend>
			<div class="flex flex-col gap-3">
				<label class="flex items-center gap-2 text-sm text-text-secondary">
					<input
						type="checkbox"
						class="accent-accent"
						checked={isEnabled(preferences, 'outdoor_area', 1440)}
						onchange={(e) => handleToggle(e, 'outdoor_area', 1440)}
					/>
					24 timmar före
				</label>
			</div>
		</fieldset>
	</section>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">Kalenderprenumeration</h2>
		<p class="mb-6 text-text-secondary">Prenumerera på dina bokningar i din kalenderapp.</p>
		<div class="mb-4 flex items-center gap-2">
			<input type="text" readonly value={calendarUrl} class="input-field min-w-0 flex-1 text-xs" />
			<Button onclick={() => handleCopyCalendarUrl(calendarUrl)}>Kopiera</Button>
		</div>
		<div class="flex flex-col gap-3">
			<!-- eslint-disable svelte/no-navigation-without-resolve -- webcal:// is an external protocol -->
			<a
				href={calendarUrl.replace('https://', 'webcal://')}
				class="text-sm text-text-secondary underline"
			>
				Öppna i kalender
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<Button onclick={handleRegenerateCalendarUrl}>Skapa ny länk</Button>
		</div>
	</section>

	<section class="border-t border-border-subtle pt-8">
		<form {...signout}>
			<Button>Logga ut</Button>
		</form>
	</section>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>
