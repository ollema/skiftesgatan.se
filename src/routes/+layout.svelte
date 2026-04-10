<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import { Toaster } from 'svelte-sonner';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import Navbar from '$lib/components/Navbar.svelte';
	import MobileMenu from '$lib/components/MobileMenu.svelte';

	let { children } = $props();

	const user = await getOptionalUser();
</script>

<Toaster richColors />

<div class="min-h-screen bg-bg font-body text-text-primary">
	<nav class="border-b border-border-subtle bg-surface">
		<div class="mx-auto max-w-240 px-4 lg:px-10">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center gap-8">
					<a
						href={resolve('/')}
						class="font-heading text-xl font-normal text-text-primary no-underline"
						>BRF Skiftesgatan 4</a
					>
					<Navbar />
				</div>
				<div class="flex items-center gap-4">
					{#if user}
						<a
							href={resolve('/konto')}
							class="hidden text-sm text-text-secondary no-underline transition-colors duration-120 hover:text-accent lg:block"
						>
							{user.username}
						</a>
					{:else}
						<a
							href={resolve('/konto/login')}
							class="hidden text-sm text-text-secondary no-underline transition-colors duration-120 hover:text-accent lg:block"
						>
							Logga in
						</a>
					{/if}
					<MobileMenu {user} />
				</div>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-240 p-4 lg:px-10 lg:py-8">
		{@render children()}
	</main>
</div>
