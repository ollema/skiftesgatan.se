<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import { resolve } from '$app/paths';
</script>

<MetaTags {...metaDefaults} title="Återställningslänk skickad" robots="noindex,nofollow" />

<h1 class="mb-4 font-heading text-2xl font-normal">Kolla din e-post</h1>
<p class="mb-6 text-text-secondary">
	Om det finns ett konto kopplat till den lägenheten har vi skickat en länk för att återställa
	lösenordet till den registrerade e-postadressen.
</p>
<a href={resolve('/konto/login')} class="text-sm">Tillbaka till inloggning</a>
