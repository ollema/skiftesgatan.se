<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1 class="mb-10 font-heading text-3xl font-normal">Book a shared space</h1>

<div class="grid gap-6 sm:grid-cols-2">
	<a
		href={resolve('/laundry')}
		class="block bg-bg-alt p-8 no-underline transition-colors duration-[120ms] hover:bg-border-subtle"
	>
		<h2 class="mb-2 font-heading text-xl font-normal text-text-primary">Laundry</h2>
		<p class="text-sm text-text-secondary">Reserve a time slot for the laundry room.</p>
	</a>

	<a
		href={resolve('/outdoor')}
		class="block bg-bg-alt p-8 no-underline transition-colors duration-[120ms] hover:bg-border-subtle"
	>
		<h2 class="mb-2 font-heading text-xl font-normal text-text-primary">Outdoor area</h2>
		<p class="text-sm text-text-secondary">Book the shared outdoor space.</p>
	</a>
</div>
