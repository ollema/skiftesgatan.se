<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { getUser, signout, changeName, changeEmail, changePassword } from '$lib/api/auth.remote';
	import {
		getCalendarUrl,
		createCalendarUrl,
		regenerateCalendarUrl,
		deleteCalendarUrl
	} from '$lib/api/calendar.remote';
	import { getPreferences, togglePreference } from '$lib/api/notification.remote';
	import { Switch } from 'bits-ui';
	import Button from '$lib/components/Button.svelte';
	import EditDialog from '$lib/components/EditDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Resource } from '$lib/types/bookings';

	let calendarUrlOverride = $state<string | null | undefined>(undefined);
	let preferenceOverrides = $state<Record<string, boolean>>({});

	let editingName = $state(false);
	let editingEmail = $state(false);
	let editingPassword = $state(false);
	let confirmRegenerate = $state(false);
	let confirmDelete = $state(false);

	async function handleCreateCalendarUrl() {
		try {
			calendarUrlOverride = await createCalendarUrl();
			toast.success('Länk skapad');
		} catch {
			toast.error('Kunde inte skapa länk');
		}
	}

	async function handleCopyCalendarUrl(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			toast.success('Länk kopierad');
		} catch {
			toast.error('Kunde inte kopiera länken');
		}
	}

	async function handleRegenerateCalendarUrl() {
		confirmRegenerate = false;
		try {
			calendarUrlOverride = await regenerateCalendarUrl();
			toast.success('Ny länk skapad');
		} catch {
			toast.error('Kunde inte skapa ny länk');
		}
	}

	async function handleDeleteCalendarUrl() {
		confirmDelete = false;
		try {
			await deleteCalendarUrl();
			calendarUrlOverride = null;
			toast.success('Länk borttagen');
		} catch {
			toast.error('Kunde inte ta bort länken');
		}
	}

	function getChecked(
		preferences: Awaited<ReturnType<typeof getPreferences>>,
		resource: Resource,
		offsetMinutes: number
	): boolean {
		const key = `${resource}-${offsetMinutes}`;
		const override = preferenceOverrides[key];
		if (override !== undefined) return override;
		return preferences.some(
			(p) => p.resource === resource && p.offsetMinutes === offsetMinutes && p.enabled
		);
	}

	async function handleToggle(resource: Resource, offsetMinutes: 60 | 1440, checked: boolean) {
		const key = `${resource}-${offsetMinutes}`;
		preferenceOverrides[key] = checked;
		try {
			await togglePreference({ resource, offsetMinutes, enabled: checked });
			toast.success(checked ? 'Avisering aktiverad' : 'Avisering inaktiverad');
		} catch {
			preferenceOverrides[key] = !checked;
			toast.error('Kunde inte uppdatera avisering');
		}
	}

	const LINK_CLASS =
		'cursor-pointer self-start text-left text-sm text-link underline decoration-1 underline-offset-3 transition-colors duration-120 hover:text-link-hover';
</script>

{#snippet settingsRow(label: string, value: string, onEdit: () => void)}
	<div class="flex items-baseline justify-between gap-4">
		<div>
			<p class="text-sm tracking-wide text-text-secondary">{label}</p>
			<p class="mt-1 text-text-primary">{value}</p>
		</div>
		<button class={LINK_CLASS} onclick={onEdit}>Ändra</button>
	</div>
{/snippet}

{#snippet notificationSwitch(
	label: string,
	preferences: Awaited<ReturnType<typeof getPreferences>>,
	resource: Resource,
	offsetMinutes: 60 | 1440
)}
	<label class="flex items-center gap-3">
		<Switch.Root
			checked={getChecked(preferences, resource, offsetMinutes)}
			onCheckedChange={(checked) => handleToggle(resource, offsetMinutes, checked)}
			class="inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-border bg-bg-alt transition-colors duration-120 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
		>
			<Switch.Thumb
				class="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-text-muted transition-transform duration-120 data-[state=checked]:translate-x-4.5 data-[state=checked]:bg-surface"
			/>
		</Switch.Root>
		<span class="text-sm text-text-secondary">{label}</span>
	</label>
{/snippet}

<svelte:boundary>
	{@const user = await getUser()}
	{@const preferences = await getPreferences()}
	{@const initialCalendarUrl = await getCalendarUrl()}
	{@const calendarUrl =
		calendarUrlOverride !== undefined ? calendarUrlOverride : initialCalendarUrl}

	<h1 class="mb-8 font-heading text-2xl font-normal">Hej, {user.name}.</h1>

	<section class="mb-8 max-w-md">
		<div class="flex flex-col gap-3">
			{@render settingsRow('Visningsnamn', user.name, () => (editingName = true))}
			{@render settingsRow('E-post', user.email, () => (editingEmail = true))}
			{@render settingsRow('Lösenord', '••••••••', () => (editingPassword = true))}
		</div>
	</section>

	<section class="mb-8 max-w-md">
		<h2 class="mb-2 font-heading text-xl font-normal">Aviseringar</h2>
		<p class="mb-3 text-sm text-text-secondary">Påminnelser via e-post innan din bokning.</p>

		<div class="flex flex-col gap-4">
			<fieldset>
				<legend class="mb-3 text-sm font-medium text-text-primary">Tvättstuga</legend>
				<div class="flex flex-col gap-4">
					{@render notificationSwitch('1 timme innan', preferences, 'laundry_room', 60)}
					{@render notificationSwitch('1 dygn innan', preferences, 'laundry_room', 1440)}
				</div>
			</fieldset>

			<fieldset>
				<legend class="mb-3 text-sm font-medium text-text-primary">Uteplats</legend>
				<div class="flex flex-col gap-4">
					{@render notificationSwitch('1 dygn innan', preferences, 'outdoor_area', 1440)}
				</div>
			</fieldset>
		</div>
	</section>

	<section class="mb-12 max-w-md">
		<h2 class="mb-2 font-heading text-xl font-normal">Kalenderprenumeration</h2>
		<p class="mb-2 text-sm text-text-secondary">Prenumerera på dina bokningar i din kalender.</p>
		{#if calendarUrl}
			<input
				type="text"
				readonly
				tabindex={-1}
				value={calendarUrl}
				class="pointer-events-none mb-4 w-full border-none bg-transparent p-0 text-xs text-text-muted outline-none select-none"
			/>
			<div class="flex flex-col gap-3">
				<button class={LINK_CLASS} onclick={() => handleCopyCalendarUrl(calendarUrl)}>
					Kopiera länk
				</button>
				<!-- eslint-disable svelte/no-navigation-without-resolve -- webcal:// is an external protocol -->
				<a href={calendarUrl.replace('https://', 'webcal://')} class={LINK_CLASS}>
					Öppna i kalender
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
				<button class={LINK_CLASS} onclick={() => (confirmRegenerate = true)}>
					Skapa ny länk
				</button>
				<button class={LINK_CLASS} onclick={() => (confirmDelete = true)}>
					Ta bort prenumeration
				</button>
			</div>
		{:else}
			<Button onclick={handleCreateCalendarUrl}>Skapa prenumerationslänk</Button>
		{/if}
	</section>

	<section class="max-w-md">
		<form {...signout}>
			<Button>Logga ut</Button>
		</form>
	</section>

	<EditDialog open={editingName} onClose={() => (editingName = false)} title="Byt visningsnamn">
		<form
			{...changeName.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					editingName = false;
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
			<Button>Spara</Button>
			{#each changeName.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</EditDialog>

	<EditDialog open={editingEmail} onClose={() => (editingEmail = false)} title="Byt e-post">
		<form
			{...changeEmail.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					editingEmail = false;
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
			<Button>Spara</Button>
			{#each changeEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</EditDialog>

	<EditDialog open={editingPassword} onClose={() => (editingPassword = false)} title="Byt lösenord">
		<form
			{...changePassword.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					editingPassword = false;
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
			<Button>Spara</Button>
			{#each changePassword.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</EditDialog>

	<ConfirmDialog
		open={confirmRegenerate}
		onClose={() => (confirmRegenerate = false)}
		onConfirm={handleRegenerateCalendarUrl}
		title="Skapa ny kalenderlänk?"
		description="Den gamla länken slutar fungera. Alla som prenumererar behöver den nya länken."
		confirmLabel="Skapa ny"
		cancelLabel="Avbryt"
	/>

	<ConfirmDialog
		open={confirmDelete}
		onClose={() => (confirmDelete = false)}
		onConfirm={handleDeleteCalendarUrl}
		title="Ta bort kalenderlänk?"
		description="Länken slutar fungera omedelbart. Du kan skapa en ny länk när som helst."
		confirmLabel="Ta bort"
		cancelLabel="Avbryt"
	/>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>
