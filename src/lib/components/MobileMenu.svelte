<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { allPages, allNews } from 'content-collections';

	interface Props {
		user: { username?: string | null } | null;
	}

	let { user }: Props = $props();

	let open = $state(false);

	afterNavigate(() => {
		open = false;
	});

	const informationPages = allPages.filter((p) => p._meta.directory.startsWith('information'));

	const latestNews = allNews
		.toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 3);

	const linkClass =
		'text-base text-text-secondary no-underline transition-colors duration-120 hover:text-accent';

	const subLinkClass =
		'text-sm text-text-muted no-underline transition-colors duration-120 hover:text-accent';
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger
		aria-label="Öppna meny"
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
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-text-primary/40" />
		<Dialog.Content
			class="fixed inset-y-0 right-0 z-50 flex w-72 flex-col overflow-y-auto bg-surface p-6 shadow-lg"
		>
			<Dialog.Title class="sr-only">Meny</Dialog.Title>

			<Dialog.Close
				aria-label="Stäng meny"
				class="absolute top-4 right-4 inline-flex size-9 items-center justify-center text-text-secondary hover:text-text-primary"
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
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</Dialog.Close>

			<nav class="mt-8 flex flex-col gap-6">
				<!-- Nyheter -->
				<div class="flex flex-col gap-2">
					<a
						href={resolve('/nyheter')}
						class={linkClass}
						class:text-accent={page.url.pathname === '/nyheter'}
					>
						Nyheter
					</a>
					<div class="flex flex-col gap-1.5 pl-3">
						{#each latestNews as item (item._meta.path)}
							<a
								href={resolve(`/nyheter/${item._meta.path}` as `/nyheter/${string}`)}
								class={subLinkClass}
								class:text-accent={page.url.pathname === `/nyheter/${item._meta.path}`}
							>
								{item.title}
							</a>
						{/each}
					</div>
				</div>

				<!-- Information -->
				<div class="flex flex-col gap-2">
					<a
						href={resolve('/information')}
						class={linkClass}
						class:text-accent={page.url.pathname === '/information'}
					>
						Information
					</a>
					<div class="flex flex-col gap-1.5 pl-3">
						{#each informationPages as infoPage (infoPage._meta.path)}
							<a
								href={resolve(`/${infoPage._meta.path}` as `/information/${string}`)}
								class={subLinkClass}
								class:text-accent={page.url.pathname === `/${infoPage._meta.path}`}
							>
								{infoPage.title}
							</a>
						{/each}
					</div>
				</div>

				<!-- Simple links -->
				<a
					href={resolve('/tvattstuga')}
					class={linkClass}
					class:text-accent={page.url.pathname.startsWith('/tvattstuga')}
				>
					Tvättstuga
				</a>
				<a
					href={resolve('/uteplats')}
					class={linkClass}
					class:text-accent={page.url.pathname.startsWith('/uteplats')}
				>
					Uteplats
				</a>
				<a
					href={resolve('/kontakt')}
					class={linkClass}
					class:text-accent={page.url.pathname.startsWith('/kontakt')}
				>
					Kontakt
				</a>
			</nav>

			<div class="mt-auto border-t border-border-subtle pt-4">
				{#if user}
					<a
						href={resolve('/konto')}
						class={linkClass}
						class:text-accent={page.url.pathname.startsWith('/konto')}
					>
						{user.username}
					</a>
				{:else}
					<a href={resolve('/konto/login')} class={linkClass}>Logga in</a>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
