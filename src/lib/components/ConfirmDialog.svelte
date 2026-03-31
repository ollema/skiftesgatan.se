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
		confirmClass = 'bg-error hover:bg-error-hover'
	}: Props = $props();
</script>

<AlertDialog.Root
	{open}
	onOpenChange={(value) => {
		if (!value) onClose();
	}}
>
	<AlertDialog.Portal>
		<AlertDialog.Overlay class="fixed inset-0 z-40 bg-text-primary/40" />
		<AlertDialog.Content
			class="fixed inset-0 z-50 m-auto flex h-fit max-w-sm flex-col border border-border bg-surface p-8"
		>
			<AlertDialog.Title class="mb-3 font-heading text-xl font-normal">{title}</AlertDialog.Title>
			<AlertDialog.Description class="mb-8 text-sm text-text-secondary">
				{description}
			</AlertDialog.Description>
			<div class="flex justify-end gap-3">
				<AlertDialog.Cancel
					class="rounded-[3px] border border-border px-6 py-2 text-sm tracking-widest uppercase transition-colors duration-[120ms] hover:bg-bg-alt"
				>
					{cancelLabel}
				</AlertDialog.Cancel>
				<AlertDialog.Action
					class="rounded-[3px] px-6 py-2 text-sm tracking-widest text-surface uppercase transition-colors duration-[120ms] {confirmClass}"
					onclick={onConfirm}
				>
					{confirmLabel}
				</AlertDialog.Action>
			</div>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
