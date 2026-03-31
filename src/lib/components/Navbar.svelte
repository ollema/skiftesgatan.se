<script lang="ts">
	import { NavigationMenu } from 'bits-ui';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { allPages, allNews } from 'content-collections';
	import { parseDate, DateFormatter, getLocalTimeZone } from '@internationalized/date';

	const informationPages = allPages.filter((p) => p._meta.directory.startsWith('information'));

	const latestNews = allNews
		.toSorted((a, b) => parseDate(b.date).compare(parseDate(a.date)))
		.slice(0, 3);

	const df = new DateFormatter('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
	const tz = getLocalTimeZone();

	const linkClass =
		'text-sm text-text-secondary no-underline transition-colors duration-120 hover:text-accent data-active:text-accent';

	const triggerClass =
		'inline-flex items-center gap-1 text-sm text-text-secondary no-underline transition-colors duration-120 hover:text-accent data-[state=open]:text-accent';
</script>

<NavigationMenu.Root>
	{#snippet child({ props })}
		<div {...props} class="{props.class ?? ''} hidden lg:flex">
			<NavigationMenu.List class="flex items-center gap-6">
				<!-- Nyheter with dropdown -->
				<NavigationMenu.Item value="nyheter" class="relative">
					<NavigationMenu.Trigger class={triggerClass}>
						Nyheter
						<svg
							class="size-3 transition-transform duration-200 in-data-[state=open]:rotate-180"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</NavigationMenu.Trigger>
					<NavigationMenu.Content
						class="absolute top-full left-0 mt-1.5 w-72 border border-border bg-surface p-4 shadow-md"
					>
						<ul class="flex flex-col gap-1">
							{#each latestNews as item (item._meta.path)}
								<li>
									<NavigationMenu.Link
										href={resolve(`/nyheter/${item._meta.path}` as `/nyheter/${string}`)}
										class="block rounded-sm p-2 no-underline transition-colors duration-120 hover:bg-bg"
									>
										<time
											class="block text-xs tracking-widest text-text-muted uppercase"
											datetime={item.date}
										>
											{df.format(parseDate(item.date).toDate(tz))}
										</time>
										<span class="text-sm text-text-primary">{item.title}</span>
									</NavigationMenu.Link>
								</li>
							{/each}
						</ul>
						<div class="mt-2 border-t border-border-subtle pt-2">
							<NavigationMenu.Link
								href={resolve('/nyheter')}
								class="block rounded-sm p-2 text-sm text-text-secondary no-underline transition-colors duration-120 hover:bg-bg hover:text-accent"
							>
								Alla nyheter
							</NavigationMenu.Link>
						</div>
					</NavigationMenu.Content>
				</NavigationMenu.Item>

				<!-- Information with dropdown -->
				<NavigationMenu.Item value="information" class="relative">
					<NavigationMenu.Trigger class={triggerClass}>
						Information
						<svg
							class="size-3 transition-transform duration-200 in-data-[state=open]:rotate-180"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</NavigationMenu.Trigger>
					<NavigationMenu.Content
						class="absolute top-full left-0 mt-1.5 w-56 border border-border bg-surface p-4 shadow-md"
					>
						<ul class="flex flex-col gap-1">
							{#each informationPages as infoPage (infoPage._meta.path)}
								<li>
									<NavigationMenu.Link
										href={resolve(`/${infoPage._meta.path}` as `/information/${string}`)}
										class="block rounded-sm p-2 text-sm text-text-secondary no-underline transition-colors duration-120 hover:bg-bg hover:text-accent"
									>
										{infoPage.title}
									</NavigationMenu.Link>
								</li>
							{/each}
						</ul>
					</NavigationMenu.Content>
				</NavigationMenu.Item>

				<!-- Simple links -->
				<NavigationMenu.Item>
					<NavigationMenu.Link
						href={resolve('/tvattstuga')}
						active={page.url.pathname.startsWith('/tvattstuga')}
						class={linkClass}
					>
						Tvättstuga
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<NavigationMenu.Item>
					<NavigationMenu.Link
						href={resolve('/uteplats')}
						active={page.url.pathname.startsWith('/uteplats')}
						class={linkClass}
					>
						Uteplats
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<NavigationMenu.Item>
					<NavigationMenu.Link
						href={resolve('/kontakt')}
						active={page.url.pathname.startsWith('/kontakt')}
						class={linkClass}
					>
						Kontakt
					</NavigationMenu.Link>
				</NavigationMenu.Item>
			</NavigationMenu.List>
		</div>
	{/snippet}
</NavigationMenu.Root>
