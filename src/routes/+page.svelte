<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1 class="mb-6 text-2xl font-bold text-gray-900">Book a shared space</h1>

<div class="grid gap-4 sm:grid-cols-2">
	<a
		href={resolve('/laundry')}
		class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
	>
		<h2 class="mb-1 text-lg font-semibold text-gray-900">Laundry</h2>
		<p class="text-sm text-gray-500">Reserve a time slot for the laundry room.</p>
	</a>

	<a
		href={resolve('/outdoor')}
		class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
	>
		<h2 class="mb-1 text-lg font-semibold text-gray-900">Outdoor area</h2>
		<p class="text-sm text-gray-500">Book the shared outdoor space.</p>
	</a>
</div>
