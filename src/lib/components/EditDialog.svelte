<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog } from 'bits-ui';

	interface Props {
		open: boolean;
		onClose: () => void;
		title: string;
		description?: string;
		children: Snippet;
	}

	let { open, onClose, title, description, children }: Props = $props();
</script>

<Dialog.Root
	{open}
	onOpenChange={(value) => {
		if (!value) onClose();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-text-primary/40" />
		<Dialog.Content
			class="fixed inset-0 z-50 m-auto flex h-fit max-h-[90vh] max-w-sm flex-col overflow-y-auto border border-border bg-surface p-8"
		>
			<Dialog.Title class="mb-3 font-heading text-xl font-normal">{title}</Dialog.Title>
			{#if description}
				<Dialog.Description class="mb-6 text-sm text-text-secondary">
					{description}
				</Dialog.Description>
			{/if}
			{@render children()}
			<Dialog.Close
				class="absolute top-4 right-4 text-text-muted transition-colors duration-120 hover:text-text-primary"
				aria-label="Stäng"
			>
				✕
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
