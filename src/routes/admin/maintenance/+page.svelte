<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '#lib/meta.js';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { parseDate, today } from '@internationalized/date';
	import {
		listClosures,
		previewClosure,
		createClosure,
		deleteClosure
	} from '#lib/api/closure.remote.js';
	import Button from '#lib/components/Button.svelte';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import { TIMEZONE, type Resource } from '#lib/types/bookings.js';
	import { formatDate, formatDateRange, formatHourNum } from '#lib/utils/date.js';

	type ClosureForm = {
		resources: Resource[];
		startDate: string;
		endDate: string;
		reason?: string;
	};

	const RESOURCE_LABELS: Record<Resource, string> = {
		laundry_room: 'Tvättstuga',
		outdoor_area: 'Uteplats'
	};

	const LINK_CLASS =
		'cursor-pointer text-sm text-link underline decoration-1 underline-offset-3 transition-colors duration-120 hover:text-link-hover';

	const todayStr = today(TIMEZONE).toString();

	let closures = $derived(await listClosures());

	let selectedResources = $state<Resource[]>(['laundry_room', 'outdoor_area']);
	let startDate = $state(todayStr);
	let endDate = $state(todayStr);
	let reason = $state('');
	let loading = $state(false);

	let pendingInput = $state<ClosureForm | null>(null);
	let previewBookings = $state<Awaited<ReturnType<typeof previewClosure>>>([]);
	let deletingId = $state<number | null>(null);

	function isSelected(resource: Resource): boolean {
		return selectedResources.includes(resource);
	}

	function toggleResource(resource: Resource, checked: boolean) {
		selectedResources = checked
			? [...new Set([...selectedResources, resource])]
			: selectedResources.filter((r) => r !== resource);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (selectedResources.length === 0) {
			toast.error('Välj minst en lokal');
			return;
		}

		const input: ClosureForm = {
			resources: selectedResources,
			startDate,
			endDate,
			reason: reason.trim() || undefined
		};

		loading = true;
		try {
			previewBookings = await previewClosure(input);
			pendingInput = input;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Kunde inte kontrollera bokningar');
		} finally {
			loading = false;
		}
	}

	async function confirmCreate() {
		if (pendingInput === null) return;
		const input = pendingInput;
		pendingInput = null;

		try {
			const result = await createClosure(input);
			toast.success(
				result.cancelledCount === 0
					? 'Dagarna är stängda'
					: result.cancelledCount === 1
						? 'Dagarna är stängda. 1 bokning avbokades.'
						: `Dagarna är stängda. ${result.cancelledCount} bokningar avbokades.`
			);
			reason = '';
			await listClosures().refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Kunde inte stänga dagarna');
		}
	}

	async function confirmDelete() {
		if (deletingId === null) return;
		const id = deletingId;
		deletingId = null;

		try {
			await deleteClosure({ id });
			toast.success('Stängningen är borttagen');
			await listClosures().refresh();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Kunde inte ta bort stängningen');
		}
	}

	let previewDescription = $derived.by(() => {
		if (pendingInput === null) return '';
		if (previewBookings.length === 0) {
			return 'Inga befintliga bokningar påverkas. Dagarna blir inte bokningsbara.';
		}

		const noun = previewBookings.length === 1 ? 'bokning' : 'bokningar';
		const shown = previewBookings
			.slice(0, 5)
			.map(
				(b) =>
					`${b.username}, ${formatDate(parseDate(b.date))} ${formatHourNum(b.startHour)}–${formatHourNum(b.endHour)}`
			)
			.join('; ');
		const more = previewBookings.length > 5 ? ` …och ${previewBookings.length - 5} till` : '';

		return `${previewBookings.length} ${noun} avbokas: ${shown}${more}. Detta kan inte ångras.`;
	});
</script>

<MetaTags {...metaDefaults} title="Admin – Stängda dagar" robots="noindex,nofollow" />

<a
	href={resolve('admin')}
	class="mb-4 inline-block text-sm text-link underline decoration-1 underline-offset-3 transition-colors duration-120 hover:text-link-hover"
>
	← Lägenheter
</a>

<h1 class="mb-2 font-heading text-2xl font-normal">Stängda dagar</h1>
<p class="mb-8 max-w-md text-sm text-text-secondary">
	Stäng av en eller flera lokaler för underhåll. Bokningar på dagarna avbokas direkt. Dagarna går
	inte att boka förrän stängningen tas bort.
</p>

<section class="mb-12 max-w-md">
	<h2 class="mb-4 font-heading text-xl font-normal">Stäng av dagar</h2>
	<form class="flex flex-col gap-5" onsubmit={handleSubmit}>
		<fieldset>
			<legend class="mb-3 text-sm font-medium text-text-primary">Lokaler</legend>
			<div class="flex flex-col gap-3">
				{#each Object.entries(RESOURCE_LABELS) as [resource, label] (resource)}
					<label class="flex items-center gap-3 text-sm text-text-secondary">
						<input
							type="checkbox"
							checked={isSelected(resource as Resource)}
							onchange={(e) => toggleResource(resource as Resource, e.currentTarget.checked)}
							class="size-4 cursor-pointer rounded-sm border-border accent-accent"
						/>
						{label}
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Från
				<input type="date" bind:value={startDate} min={todayStr} class="input-field" />
			</label>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Till
				<input type="date" bind:value={endDate} min={todayStr} class="input-field" />
			</label>
		</div>

		<label class="flex flex-col gap-1 text-sm text-text-secondary">
			Orsak (valfritt)
			<input
				type="text"
				bind:value={reason}
				maxlength={200}
				placeholder="Till exempel underhåll av tvättmaskinerna"
				class="input-field"
			/>
		</label>

		<Button type="submit" disabled={loading}>Stäng av dagar</Button>
	</form>
</section>

<section class="max-w-xl">
	<h2 class="mb-3 font-heading text-xl font-normal">Kommande stängningar</h2>
	{#if closures.length === 0}
		<p class="text-sm text-text-secondary">Inga kommande stängningar.</p>
	{:else}
		<div class="flex flex-col">
			{#each closures as closure (closure.id)}
				<div
					class="flex items-start justify-between gap-4 border-b border-border-subtle py-3 last:border-0"
				>
					<div>
						<p class="text-text-primary">{RESOURCE_LABELS[closure.resource]}</p>
						<p class="mt-0.5 text-sm text-text-secondary">
							{formatDateRange(parseDate(closure.startDate), parseDate(closure.endDate))}
							{#if closure.reason}
								· {closure.reason}
							{/if}
						</p>
						<p class="mt-0.5 text-xs text-text-muted">
							{closure.cancelledCount === 0
								? 'Inga bokningar avbokades'
								: closure.cancelledCount === 1
									? '1 bokning avbokades'
									: `${closure.cancelledCount} bokningar avbokades`}
						</p>
					</div>
					<button type="button" class={LINK_CLASS} onclick={() => (deletingId = closure.id)}>
						Ta bort
					</button>
				</div>
			{/each}
		</div>
	{/if}
</section>

<ConfirmDialog
	open={pendingInput !== null}
	onClose={() => {
		pendingInput = null;
		previewBookings = [];
	}}
	onConfirm={confirmCreate}
	title="Stäng av dagar?"
	description={previewDescription}
	confirmLabel="Stäng av"
	cancelLabel="Avbryt"
/>

<ConfirmDialog
	open={deletingId !== null}
	onClose={() => (deletingId = null)}
	onConfirm={confirmDelete}
	title="Ta bort stängning?"
	description="Dagarna blir bokningsbara igen. Avbokade bokningar återställs inte."
	confirmLabel="Ta bort"
	cancelLabel="Avbryt"
/>
