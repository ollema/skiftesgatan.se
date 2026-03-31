<script lang="ts">
	import { login, signup } from '$lib/api/auth.remote';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
</script>

<h1>Login</h1>
<form {...login}>
	<label>
		Apartment
		<input
			{...login.fields.username.as('text')}
			placeholder="e.g. A1001"
			maxlength="5"
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<label>
		Password
		<input
			{...login.fields._password.as('password')}
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<Button>Login</Button>
	<a href={resolve('/auth/forgot-password')} class="text-sm text-blue-600 hover:underline"
		>Forgot password?</a
	>
	{#each login.fields.allIssues() as issue (issue.message)}
		<p class="text-red-500">{issue.message}</p>
	{/each}
</form>

<h2>Or register</h2>
<form {...signup}>
	<label>
		Apartment
		<input
			{...signup.fields.username.as('text')}
			placeholder="e.g. A1001"
			maxlength="5"
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<label>
		Email
		<input
			{...signup.fields.email.as('email')}
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<label>
		Password
		<input
			{...signup.fields._password.as('password')}
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<Button>Register</Button>
	{#each signup.fields.allIssues() as issue (issue.message)}
		<p class="text-red-500">{issue.message}</p>
	{/each}
</form>
