<script lang="ts">
	import { NavigationMenu } from 'bits-ui';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';

	interface Props {
		links: ReadonlyArray<{ readonly path: Pathname; readonly label: string }>;
	}

	let { links }: Props = $props();
</script>

<NavigationMenu.Root>
	{#snippet child({ props })}
		<div {...props} class="hidden lg:flex">
			<NavigationMenu.List class="flex items-center gap-6">
				{#each links as link (link.path)}
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href={resolve(link.path)}
							active={page.url.pathname.startsWith(link.path)}
							class="text-sm text-text-secondary no-underline transition-colors duration-120 hover:text-accent data-active:text-accent"
						>
							{link.label}
						</NavigationMenu.Link>
					</NavigationMenu.Item>
				{/each}
			</NavigationMenu.List>
		</div>
	{/snippet}
</NavigationMenu.Root>
