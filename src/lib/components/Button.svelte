<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { Button } from 'bits-ui';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'destructive';
		children: Snippet;
	}

	let { variant = 'primary', children, class: className, ...rest }: Props = $props();

	const variantClasses: Record<string, string> = {
		primary:
			'rounded-[3px] bg-accent px-6 py-2 text-surface text-sm font-body uppercase tracking-widest transition-colors duration-[120ms] hover:bg-accent-hover',
		destructive:
			'rounded-[3px] bg-error px-6 py-2 text-surface text-sm font-body uppercase tracking-widest transition-colors duration-[120ms] hover:bg-error-hover'
	};
</script>

<Button.Root class="{variantClasses[variant]} {className ?? ''}" {...rest}>
	{@render children()}
</Button.Root>
