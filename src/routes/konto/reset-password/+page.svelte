<script lang="ts">
	import { resetPassword } from '$lib/api/auth.remote';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';

	const token = page.url.searchParams.get('token');
	const error = page.url.searchParams.get('error');
</script>

{#if error}
	<h1 class="mb-4 font-heading text-2xl font-normal">Ogiltig eller utgången länk</h1>
	<p class="mb-6 text-text-secondary">
		Länken för att återställa lösenordet är ogiltig eller har gått ut.
	</p>
	<a href={resolve('/konto/forgot-password')} class="text-sm">Begär en ny länk</a>
{:else}
	<h1 class="mb-4 font-heading text-2xl font-normal">Återställ ditt lösenord</h1>
	<form {...resetPassword} class="mb-6 flex max-w-sm flex-col gap-4">
		<input type="hidden" name="token" value={token} />
		<label class="flex flex-col gap-1 text-sm text-text-secondary">
			Nytt lösenord
			<input {...resetPassword.fields._newPassword.as('password')} class="input-field" />
		</label>
		<Button>Återställ lösenord</Button>
		{#each resetPassword.fields.allIssues() as issue (issue.message)}
			<p class="text-sm text-error">{issue.message}</p>
		{/each}
	</form>
	<a href={resolve('/konto/login')} class="text-sm">Tillbaka till inloggning</a>
{/if}
