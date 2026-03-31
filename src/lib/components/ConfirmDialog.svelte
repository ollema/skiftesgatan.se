<script lang="ts">
	import { AlertDialog } from 'bits-ui';

	interface Props {
		open: boolean;
		onClose: () => void;
		onConfirm: () => void;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		confirmClass?: string;
	}

	let {
		open,
		onClose,
		onConfirm,
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Go back',
		confirmClass = 'bg-red-600 hover:bg-red-700'
	}: Props = $props();
</script>

<AlertDialog.Root
	{open}
	onOpenChange={(value) => {
		if (!value) onClose();
	}}
>
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
					class="rounded-md px-4 py-2 text-sm text-white {confirmClass}"
					onclick={onConfirm}
				>
					{confirmLabel}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
