<script lang="ts">
	import { resetPassword } from '$lib/api/auth.remote';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const token = page.url.searchParams.get('token');
	const error = page.url.searchParams.get('error');
</script>

{#if error}
	<h1>Invalid or expired link</h1>
	<p>This password reset link is invalid or has expired.</p>
	<a href={resolve('/auth/forgot-password')} class="text-sm text-blue-600 hover:underline"
		>Request a new link</a
	>
{:else}
	<h1>Reset your password</h1>
	<form {...resetPassword}>
		<input type="hidden" name="token" value={token} />
		<label>
			New password
			<input
				{...resetPassword.fields._newPassword.as('password')}
				class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			/>
		</label>
		<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
			>Reset password</button
		>
		{#each resetPassword.fields.allIssues() as issue (issue.message)}
			<p class="text-red-500">{issue.message}</p>
		{/each}
	</form>
	<a href={resolve('/auth/login')} class="text-sm text-blue-600 hover:underline">Back to login</a>
{/if}
