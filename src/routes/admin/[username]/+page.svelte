<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { Switch } from 'bits-ui';
	import { getUser } from '$lib/api/auth.remote';
	import {
		getUserByUsername,
		updateUserName,
		updateUserEmail,
		sendPasswordResetForUser,
		setUserRole,
		setUserNotificationPreference,
		createUserCalendarUrl,
		regenerateUserCalendarUrl,
		deleteUserCalendarUrl
	} from '$lib/api/admin.remote';
	import Button from '$lib/components/Button.svelte';
	import EditDialog from '$lib/components/EditDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { Resource } from '$lib/types/bookings';

	let username = $derived(page.params.username ?? '');

	let editingName = $state(false);
	let editingEmail = $state(false);
	let confirmRoleChange = $state(false);
	let confirmRegenerate = $state(false);
	let confirmDelete = $state(false);

	let calendarUrlOverride = $state<string | null | undefined>(undefined);
	let preferenceOverrides = $state<Record<string, boolean>>({});

	async function handleSendReset(email: string) {
		try {
			await sendPasswordResetForUser({ username });
			toast.success(`Återställningsmejl skickat till ${email}`);
		} catch {
			toast.error('Kunde inte skicka återställningsmejl');
		}
	}

	async function handleRoleChange(nextRole: 'user' | 'admin') {
		confirmRoleChange = false;
		try {
			await setUserRole({ username, role: nextRole });
			toast.success(nextRole === 'admin' ? 'Användaren är nu admin' : 'Admin-behörighet borttagen');
		} catch {
			toast.error('Kunde inte ändra roll');
		}
	}

	function getChecked(
		preferences: Awaited<ReturnType<typeof getUserByUsername>>['preferences'],
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
			await setUserNotificationPreference({ username, resource, offsetMinutes, enabled: checked });
			toast.success(checked ? 'Avisering aktiverad' : 'Avisering inaktiverad');
		} catch {
			preferenceOverrides[key] = !checked;
			toast.error('Kunde inte uppdatera avisering');
		}
	}

	async function handleCreateCalendarUrl() {
		try {
			calendarUrlOverride = await createUserCalendarUrl({ username });
			toast.success('Länk skapad');
		} catch {
			toast.error('Kunde inte skapa länk');
		}
	}

	async function handleRegenerateCalendarUrl() {
		confirmRegenerate = false;
		try {
			calendarUrlOverride = await regenerateUserCalendarUrl({ username });
			toast.success('Ny länk skapad');
		} catch {
			toast.error('Kunde inte skapa ny länk');
		}
	}

	async function handleDeleteCalendarUrl() {
		confirmDelete = false;
		try {
			await deleteUserCalendarUrl({ username });
			calendarUrlOverride = null;
			toast.success('Länk borttagen');
		} catch {
			toast.error('Kunde inte ta bort länken');
		}
	}

	const LINK_CLASS =
		'cursor-pointer self-start text-left text-sm text-link underline decoration-1 underline-offset-3 transition-colors duration-120 hover:text-link-hover';
</script>

{#snippet settingsRow(label: string, value: string, onEdit: () => void, disabled = false)}
	<div class="flex items-baseline justify-between gap-4">
		<div>
			<p class="text-sm tracking-wide text-text-secondary">{label}</p>
			<p class="mt-1 text-text-primary">{value}</p>
		</div>
		{#if !disabled}
			<button class={LINK_CLASS} onclick={onEdit}>Ändra</button>
		{/if}
	</div>
{/snippet}

<MetaTags {...metaDefaults} title="Admin – {username}" robots="noindex,nofollow" />

<svelte:boundary>
	{@const data = await getUserByUsername({ username })}
	{@const currentUser = await getUser()}
	{@const target = data.user}
	{@const isSelf = currentUser.id === target.id}
	{@const initialCalendarUrl = data.calendarUrl}
	{@const calendarUrl =
		calendarUrlOverride !== undefined ? calendarUrlOverride : initialCalendarUrl}
	{@const isAdmin = target.role === 'admin'}

	<a
		href={resolve('/admin')}
		class="mb-4 inline-block text-sm text-link underline decoration-1 underline-offset-3 transition-colors duration-120 hover:text-link-hover"
	>
		← Lägenheter
	</a>

	<h1 class="mb-8 font-heading text-2xl font-normal">
		{target.username} — {target.name}
	</h1>

	<section class="mb-8 max-w-md">
		<h2 class="mb-3 font-heading text-xl font-normal">Konto</h2>
		<div class="flex flex-col gap-3">
			{@render settingsRow('Visningsnamn', target.name, () => (editingName = true))}
			{@render settingsRow('E-post', target.email, () => (editingEmail = true))}
			{@render settingsRow(
				'Roll',
				isAdmin ? 'Admin' : 'Användare',
				() => (confirmRoleChange = true),
				isSelf
			)}
			{#if isSelf}
				<p class="text-xs text-text-muted">Du kan inte ändra din egen roll.</p>
			{/if}
		</div>
	</section>

	<section class="mb-8 max-w-md">
		<h2 class="mb-2 font-heading text-xl font-normal">Lösenord</h2>
		<p class="mb-3 text-sm text-text-secondary">
			Skickar ett återställningsmejl till {target.email}.
		</p>
		<Button onclick={() => handleSendReset(target.email)}>Skicka återställningsmejl</Button>
	</section>

	<section class="mb-8 max-w-md">
		<h2 class="mb-2 font-heading text-xl font-normal">Aviseringar</h2>
		<p class="mb-3 text-sm text-text-secondary">
			Påminnelser via e-post innan {target.username}s bokningar.
		</p>

		<div class="flex flex-col gap-4">
			<fieldset>
				<legend class="mb-3 text-sm font-medium text-text-primary">Tvättstuga</legend>
				<div class="flex flex-col gap-4">
					{@render notificationSwitch('1 timme innan', data.preferences, 'laundry_room', 60)}
					{@render notificationSwitch('1 dygn innan', data.preferences, 'laundry_room', 1440)}
				</div>
			</fieldset>

			<fieldset>
				<legend class="mb-3 text-sm font-medium text-text-primary">Uteplats</legend>
				<div class="flex flex-col gap-4">
					{@render notificationSwitch('1 dygn innan', data.preferences, 'outdoor_area', 1440)}
				</div>
			</fieldset>
		</div>
	</section>

	<section class="mb-12 max-w-md">
		<h2 class="mb-2 font-heading text-xl font-normal">Kalenderprenumeration</h2>
		{#if calendarUrl}
			<p class="mb-2 text-sm text-text-secondary">Aktiv prenumerationslänk.</p>
			<input
				type="text"
				readonly
				tabindex={-1}
				value={calendarUrl}
				class="pointer-events-none mb-4 w-full border-none bg-transparent p-0 text-xs text-text-muted outline-none select-none"
			/>
			<div class="flex flex-col gap-3">
				<button class={LINK_CLASS} onclick={() => (confirmRegenerate = true)}>Skapa ny länk</button>
				<button class={LINK_CLASS} onclick={() => (confirmDelete = true)}
					>Ta bort prenumeration</button
				>
			</div>
		{:else}
			<p class="mb-3 text-sm text-text-secondary">Användaren har ingen prenumerationslänk.</p>
			<Button onclick={handleCreateCalendarUrl}>Skapa prenumerationslänk</Button>
		{/if}
	</section>

	<EditDialog open={editingName} onClose={() => (editingName = false)} title="Byt visningsnamn">
		<form
			{...updateUserName.enhance(async ({ submit, form }) => {
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
			<input type="hidden" name="username" value={target.username} />
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nytt visningsnamn
				<input {...updateUserName.fields.name.as('text')} class="input-field" />
			</label>
			<Button>Spara</Button>
			{#each updateUserName.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</EditDialog>

	<EditDialog open={editingEmail} onClose={() => (editingEmail = false)} title="Byt e-post">
		<form
			{...updateUserEmail.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					editingEmail = false;
					toast.success('E-post uppdaterad');
				} catch {
					toast.error('Kunde inte byta e-post');
				}
			})}
			class="flex flex-col gap-4"
		>
			<input type="hidden" name="username" value={target.username} />
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Ny e-post
				<input {...updateUserEmail.fields.email.as('email')} class="input-field" />
			</label>
			<Button>Spara</Button>
			{#each updateUserEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</EditDialog>

	<ConfirmDialog
		open={confirmRoleChange}
		onClose={() => (confirmRoleChange = false)}
		onConfirm={() => handleRoleChange(isAdmin ? 'user' : 'admin')}
		title={isAdmin ? 'Ta bort admin-behörighet?' : 'Gör till admin?'}
		description={isAdmin
			? `${target.username} kommer inte längre kunna hantera andra användare.`
			: `${target.username} kommer kunna hantera alla användares konton.`}
		confirmLabel={isAdmin ? 'Ta bort' : 'Gör till admin'}
		cancelLabel="Avbryt"
		confirmClass={isAdmin ? 'bg-error hover:bg-error-hover' : 'bg-accent hover:bg-accent-hover'}
	/>

	<ConfirmDialog
		open={confirmRegenerate}
		onClose={() => (confirmRegenerate = false)}
		onConfirm={handleRegenerateCalendarUrl}
		title="Skapa ny kalenderlänk?"
		description="Den gamla länken slutar fungera. Användaren behöver den nya länken."
		confirmLabel="Skapa ny"
		cancelLabel="Avbryt"
	/>

	<ConfirmDialog
		open={confirmDelete}
		onClose={() => (confirmDelete = false)}
		onConfirm={handleDeleteCalendarUrl}
		title="Ta bort kalenderlänk?"
		description="Länken slutar fungera omedelbart."
		confirmLabel="Ta bort"
		cancelLabel="Avbryt"
	/>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>

{#snippet notificationSwitch(
	label: string,
	preferences: Awaited<ReturnType<typeof getUserByUsername>>['preferences'],
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
