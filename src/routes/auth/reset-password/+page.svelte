<script lang="ts">
	import { resetPassword } from '$lib/api/auth.remote';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';

	const token = page.url.searchParams.get('token');
	const error = page.url.searchParams.get('error');
</script>

{#if error}
	<h1 class="mb-4 font-heading text-2xl font-normal">Invalid or expired link</h1>
	<p class="mb-6 text-text-secondary">This password reset link is invalid or has expired.</p>
	<a href={resolve('/auth/forgot-password')} class="text-sm">Request a new link</a>
{:else}
	<h1 class="mb-4 font-heading text-2xl font-normal">Reset your password</h1>
	<form {...resetPassword} class="mb-6 flex max-w-sm flex-col gap-4">
		<input type="hidden" name="token" value={token} />
		<label class="flex flex-col gap-1 text-sm text-text-secondary">
			New password
			<input {...resetPassword.fields._newPassword.as('password')} class="input-field" />
		</label>
		<Button>Reset password</Button>
		{#each resetPassword.fields.allIssues() as issue (issue.message)}
			<p class="text-sm text-error">{issue.message}</p>
		{/each}
	</form>
	<a href={resolve('/auth/login')} class="text-sm">Back to login</a>
{/if}
