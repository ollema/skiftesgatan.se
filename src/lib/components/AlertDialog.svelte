<script lang="ts">
	import { AlertDialog } from 'bits-ui';

	interface Props {
		title: string;
		description: string;
		triggerLabel: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm: () => void;
	}

	let {
		title,
		description,
		triggerLabel,
		confirmLabel = 'Confirm',
		cancelLabel = 'Go back',
		onconfirm
	}: Props = $props();

	let open = $state(false);
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Trigger
		class="rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
	>
		{triggerLabel}
	</AlertDialog.Trigger>

	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-40 bg-black/50" />

		<AlertDialog.Content
			class="fixed inset-0 z-50 m-auto flex h-fit max-w-sm flex-col rounded-lg bg-white p-6 shadow-lg"
		>
			<AlertDialog.Title class="mb-2 text-lg font-semibold">{title}</AlertDialog.Title>

			<AlertDialog.Description class="mb-6 text-sm text-gray-600">
				{description}
			</AlertDialog.Description>

			<div class="flex justify-end gap-3">
				<AlertDialog.Cancel
					class="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
				>
					{cancelLabel}
				</AlertDialog.Cancel>

				<AlertDialog.Action
					class="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
					onclick={() => {
						onconfirm();
						open = false;
					}}
				>
					{confirmLabel}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
