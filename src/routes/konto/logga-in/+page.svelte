<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import { login } from '$lib/api/auth.remote';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
</script>

<MetaTags {...metaDefaults} title="Logga in" robots="noindex,nofollow" />

<h1 class="mb-6 font-heading text-2xl font-normal">Logga in</h1>
<form {...login} class="mb-8 flex max-w-sm flex-col gap-4">
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Lägenhet
		<input
			{...login.fields.username.as('text')}
			placeholder="t.ex. A1001"
			maxlength="5"
			class="input-field"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Lösenord
		<input {...login.fields._password.as('password')} class="input-field" />
	</label>
	<Button>Logga in</Button>
	<a href={resolve('/konto/glomt-losenord')} class="text-sm">Glömt lösenordet?</a>
	{#each login.fields.allIssues() as issue (issue.message)}
		<p class="text-sm text-error">{issue.message}</p>
	{/each}
</form>
