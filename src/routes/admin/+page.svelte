<script lang="ts">
	import { resolve } from '$app/paths';
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import { listUsers } from '$lib/api/admin.remote';
</script>

<MetaTags {...metaDefaults} title="Admin" robots="noindex,nofollow" />

<svelte:boundary>
	{@const users = await listUsers()}

	<h1 class="mb-2 font-heading text-2xl font-normal">Lägenheter</h1>
	<p class="mb-8 text-sm text-text-secondary">
		Hantera kontouppgifter, aviseringar och kalenderprenumerationer.
	</p>

	<table class="w-full border-collapse text-sm">
		<thead>
			<tr
				class="border-b border-border text-left text-xs tracking-wide text-text-secondary uppercase"
			>
				<th class="py-3 pr-4 font-normal">Lägenhet</th>
				<th class="py-3 pr-4 font-normal">Namn</th>
				<th class="py-3 pr-4 font-normal">E-post</th>
				<th class="py-3 pr-4 font-normal">Status</th>
				<th class="py-3 pl-4 font-normal"></th>
			</tr>
		</thead>
		<tbody>
			{#each users as user (user.id)}
				<tr class="border-b border-border-subtle">
					<td class="py-3 pr-4 font-mono">{user.username}</td>
					<td class="py-3 pr-4">{user.name}</td>
					<td class="py-3 pr-4 text-text-secondary">{user.email}</td>
					<td class="py-3 pr-4 text-xs">
						{#if user.role === 'admin'}
							<span class="text-accent">Admin</span>
						{/if}
						{#if !user.emailVerified}
							<span class="text-text-muted">Overifierad e-post</span>
						{/if}
					</td>
					<td class="py-3 pl-4 text-right">
						<a
							href={resolve('/admin/[username]', { username: user.username ?? '' })}
							class="text-sm text-link underline decoration-1 underline-offset-3 transition-colors duration-120 hover:text-link-hover"
						>
							Visa
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>
