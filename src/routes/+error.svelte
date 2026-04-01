<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<div class="flex min-h-[60vh] items-center justify-center text-center">
	<div class="max-w-120 px-4">
		<p class="mb-4 text-xs tracking-widest text-text-muted uppercase">Fel {page.status}</p>
		<h1 class="mb-6 font-heading text-2xl font-normal">
			{#if page.status === 404}
				Sidan hittades inte
			{:else}
				Något gick fel
			{/if}
		</h1>
		<p class="text-text-secondary">
			{page.error?.message ?? 'Ett oväntat fel uppstod.'}
		</p>
		<a href={resolve('/')} class="mt-6 inline-block text-sm">Till startsidan</a>
	</div>
</div>
