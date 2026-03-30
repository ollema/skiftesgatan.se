<script lang="ts">
	import { requestPasswordReset } from '$lib/api/auth.remote';
	import { resolve } from '$app/paths';
</script>

<h1>Forgot password</h1>
<p>Enter your email address and we'll send you a link to reset your password.</p>

<form {...requestPasswordReset}>
	<label>
		Email
		<input
			{...requestPasswordReset.fields.email.as('email')}
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
		>Send reset link</button
	>
	{#each requestPasswordReset.fields.allIssues() as issue (issue.message)}
		<p class="text-red-500">{issue.message}</p>
	{/each}
</form>

<a href={resolve('/auth/login')} class="text-sm text-blue-600 hover:underline">Back to login</a>
