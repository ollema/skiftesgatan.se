<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-bg font-body text-text-primary">
	<nav class="border-b border-border-subtle bg-surface">
		<div class="mx-auto max-w-[960px] px-4 lg:px-10">
			<div class="flex h-16 items-center justify-between">
				<a
					href={resolve('/')}
					class="font-heading text-xl font-normal text-text-primary no-underline">Skiftesgatan</a
				>
				<div class="flex gap-6">
					<a
						href={resolve('/nyheter')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Nyheter</a
					>
					<a
						href={resolve('/information')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Information</a
					>
					<a
						href={resolve('/tvattstuga')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Tvättstuga</a
					>
					<a
						href={resolve('/uteplats')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Uteplats</a
					>
					<a
						href={resolve('/kontakt')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Kontakt</a
					>
					<a
						href={resolve('/konto')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Konto</a
					>
				</div>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-[960px] px-4 py-16 lg:px-10">
		{@render children()}
	</main>
</div>
