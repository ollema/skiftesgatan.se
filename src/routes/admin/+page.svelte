<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import { listUsers } from '$lib/api/admin.remote';
	import { formatDateTime } from '$lib/utils/date';

	let users = $derived(await listUsers());

	function rowHref(username: string | null) {
		return resolve('/admin/[username]', { username: username ?? '' });
	}

	function handleRowClick(event: MouseEvent, username: string | null) {
		if (event.defaultPrevented) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (event.button !== 0) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('a')) return;
		goto(rowHref(username));
	}
</script>

<MetaTags {...metaDefaults} title="Admin" robots="noindex,nofollow" />

<h1 class="mb-2 font-heading text-2xl font-normal">Lägenheter</h1>
<p class="mb-8 text-sm text-text-secondary">
	Hantera kontouppgifter, aviseringar och kalenderprenumerationer.
</p>

<div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr
				class="border-b border-border text-left text-xs tracking-wide text-text-secondary uppercase"
			>
				<th class="w-px py-3 pr-4 font-normal whitespace-nowrap">Lägenhet</th>
				<th class="w-px py-3 pr-4 font-normal whitespace-nowrap">Namn</th>
				<th class="w-px py-3 pr-10 font-normal whitespace-nowrap">Status</th>
				<th class="py-3 font-normal">Senast aktiv</th>
			</tr>
		</thead>
		<tbody>
			{#each users as user (user.id)}
				<tr
					class="cursor-pointer border-b border-border-subtle transition-colors duration-120 focus-within:bg-bg-alt hover:bg-bg-alt"
					onclick={(e) => handleRowClick(e, user.username)}
				>
					<td class="py-3 pr-4 font-mono whitespace-nowrap">
						<a
							href={rowHref(user.username)}
							class="text-text-primary no-underline focus-visible:underline focus-visible:decoration-1 focus-visible:underline-offset-3"
						>
							{user.username}
						</a>
					</td>
					<td class="py-3 pr-4 whitespace-nowrap">{user.name}</td>
					<td class="py-3 pr-10 whitespace-nowrap text-text-secondary">
						<span class="inline-flex items-center gap-2">
							<svg
								class={['size-4', user.role !== 'admin' && 'text-border']}
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-label={user.role === 'admin' ? 'Admin' : undefined}
								aria-hidden={user.role === 'admin' ? undefined : 'true'}
							>
								{#if user.role === 'admin'}<title>Admin</title>{/if}
								<path
									d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
								/>
							</svg>
							<svg
								class={['size-4', !user.hasActiveReminderPreference && 'text-border']}
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-label={user.hasActiveReminderPreference ? 'Aviseringar' : undefined}
								aria-hidden={user.hasActiveReminderPreference ? undefined : 'true'}
							>
								{#if user.hasActiveReminderPreference}<title>Aviseringar</title>{/if}
								<path d="M10.268 21a2 2 0 0 0 3.464 0" />
								<path
									d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
								/>
							</svg>
							<svg
								class={['size-4', !user.hasCalendarSubscription && 'text-border']}
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-label={user.hasCalendarSubscription ? 'Kalenderprenumeration' : undefined}
								aria-hidden={user.hasCalendarSubscription ? undefined : 'true'}
							>
								{#if user.hasCalendarSubscription}<title>Kalenderprenumeration</title>{/if}
								<path d="M11 14h1v4" />
								<path d="M16 2v4" />
								<path d="M3 10h18" />
								<path d="M8 2v4" />
								<rect x="3" y="4" width="18" height="18" rx="2" />
							</svg>
						</span>
					</td>
					<td class="py-3 whitespace-nowrap text-text-secondary">
						{user.lastActiveAt ? formatDateTime(user.lastActiveAt) : '—'}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
