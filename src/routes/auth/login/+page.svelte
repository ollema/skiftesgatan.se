<script lang="ts">
	import { login, signup } from '$lib/api/auth.remote';
	import { resolve } from '$app/paths';
</script>

<h1>Login</h1>
<form {...login}>
	<label>
		Apartment
		<input
			{...login.fields.username.as('text')}
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
	<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
		>Login</button
	>
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
	<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
		>Register</button
	>
	{#each signup.fields.allIssues() as issue (issue.message)}
		<p class="text-red-500">{issue.message}</p>
	{/each}
</form>
