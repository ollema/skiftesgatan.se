<script lang="ts">
	import { login, signup } from '$lib/api/auth.remote';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
</script>

<h1 class="mb-6 font-heading text-2xl font-normal">Login</h1>
<form {...login} class="mb-8 flex max-w-sm flex-col gap-4">
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Apartment
		<input
			{...login.fields.username.as('text')}
			placeholder="e.g. A1001"
			maxlength="5"
			class="input-field"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Password
		<input {...login.fields._password.as('password')} class="input-field" />
	</label>
	<Button>Login</Button>
	<a href={resolve('/auth/forgot-password')} class="text-sm">Forgot password?</a>
	{#each login.fields.allIssues() as issue (issue.message)}
		<p class="text-sm text-error">{issue.message}</p>
	{/each}
</form>

<h2 class="mb-6 font-heading text-xl font-normal">Or register</h2>
<form {...signup} class="flex max-w-sm flex-col gap-4">
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Apartment
		<input
			{...signup.fields.username.as('text')}
			placeholder="e.g. A1001"
			maxlength="5"
			class="input-field"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Email
		<input {...signup.fields.email.as('email')} class="input-field" />
	</label>
	<label class="flex flex-col gap-1 text-sm text-text-secondary">
		Password
		<input {...signup.fields._password.as('password')} class="input-field" />
	</label>
	<Button>Register</Button>
	{#each signup.fields.allIssues() as issue (issue.message)}
		<p class="text-sm text-error">{issue.message}</p>
	{/each}
</form>
