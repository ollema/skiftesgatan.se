<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1 class="mb-4 font-heading text-2xl font-normal">Kolla din e-post</h1>
<p class="mb-6 text-text-secondary">
	Om det finns ett konto med den e-postadressen har vi skickat en länk för att återställa
	lösenordet.
</p>
<a href={resolve('/konto/login')} class="text-sm">Tillbaka till inloggning</a>
