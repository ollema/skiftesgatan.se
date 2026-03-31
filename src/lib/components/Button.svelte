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
		primary: 'rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700',
		destructive: 'rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700'
	};
</script>

<Button.Root class="{variantClasses[variant]} {className ?? ''}" {...rest}>
	{@render children()}
</Button.Root>
