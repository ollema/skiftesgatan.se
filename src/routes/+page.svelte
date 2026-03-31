<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1 class="mb-10 font-heading text-3xl font-normal">Boka gemensamt utrymme</h1>

<div class="grid gap-6 sm:grid-cols-2">
	<a
		href={resolve('/tvattstuga')}
		class="block bg-bg-alt p-8 no-underline transition-colors duration-120 hover:bg-border-subtle"
	>
		<h2 class="mb-2 font-heading text-xl font-normal text-text-primary">Tvättstuga</h2>
		<p class="text-sm text-text-secondary">Boka en tid i tvättstugan.</p>
	</a>

	<a
		href={resolve('/uteplats')}
		class="block bg-bg-alt p-8 no-underline transition-colors duration-120 hover:bg-border-subtle"
	>
		<h2 class="mb-2 font-heading text-xl font-normal text-text-primary">Uteplats</h2>
		<p class="text-sm text-text-secondary">Boka den gemensamma uteplatsen.</p>
	</a>
</div>
