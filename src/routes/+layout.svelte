<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import { Toaster } from 'svelte-sonner';
	import { getOptionalUser } from '$lib/api/auth.remote';
	import Navbar from '$lib/components/Navbar.svelte';
	import MobileMenu from '$lib/components/MobileMenu.svelte';

	let { children } = $props();
</script>

<Toaster richColors />

<div class="min-h-screen bg-bg font-body text-text-primary">
	<nav class="border-b border-border-subtle bg-surface">
		<div class="mx-auto max-w-240 px-4 lg:px-10">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center gap-8">
					<a
						href={resolve('/')}
						class="font-heading text-xl font-normal text-text-primary no-underline">Skiftesgatan</a
					>
					<Navbar />
				</div>

				<svelte:boundary>
					{@const user = await getOptionalUser()}
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

					{#snippet pending()}
						<div class="flex items-center gap-4">
							<div class="hidden h-5 w-12 animate-pulse rounded-sm bg-border-subtle lg:block"></div>
							<div
								class="inline-flex size-9 items-center justify-center text-text-primary lg:hidden"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="3" y1="6" x2="21" y2="6" />
									<line x1="3" y1="12" x2="21" y2="12" />
									<line x1="3" y1="18" x2="21" y2="18" />
								</svg>
							</div>
						</div>
					{/snippet}
				</svelte:boundary>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-240 p-4 lg:px-10 lg:py-6">
		{@render children()}
	</main>
</div>
