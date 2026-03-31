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
						href={resolve('/news')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>News</a
					>
					<a
						href={resolve('/information')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Information</a
					>
					<a
						href={resolve('/laundry')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Laundry</a
					>
					<a
						href={resolve('/outdoor')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Outdoor</a
					>
					<a
						href={resolve('/contact')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Contact</a
					>
					<a
						href={resolve('/auth')}
						class="text-sm text-text-secondary no-underline transition-colors duration-[120ms] hover:text-accent"
						>Account</a
					>
				</div>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-[960px] px-4 py-16 lg:px-10">
		{@render children()}
	</main>
</div>
