<script lang="ts">
	import { requestPasswordReset } from '$lib/api/auth.remote';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
</script>

<h1 class="mb-4 font-heading text-2xl font-normal">Glömt lösenord</h1>
<p class="mb-8 text-text-secondary">
	Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
</p>

<form {...requestPasswordReset} class="mb-6 flex max-w-sm flex-col gap-4">
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		E-post
		<input {...requestPasswordReset.fields.email.as('email')} class="input-field" />
	</label>
	<Button>Skicka återställningslänk</Button>
	{#each requestPasswordReset.fields.allIssues() as issue (issue.message)}
		<p class="text-sm text-error">{issue.message}</p>
	{/each}
</form>

<a href={resolve('/konto/login')} class="text-sm">Tillbaka till inloggning</a>
