<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white shadow-sm">
		<div class="mx-auto max-w-4xl px-4">
			<div class="flex h-14 items-center justify-between">
				<a href={resolve('/')} class="text-lg font-semibold text-gray-900">Skiftesgatan</a>
				<div class="flex gap-4">
					<a href={resolve('/laundry')} class="text-sm text-gray-600 hover:text-gray-900">Laundry</a
					>
					<a href={resolve('/outdoor')} class="text-sm text-gray-600 hover:text-gray-900">Outdoor</a
					>
					<a href={resolve('/auth')} class="text-sm text-gray-600 hover:text-gray-900">Account</a>
				</div>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-4xl px-4 py-8">
		{@render children()}
	</main>
</div>
