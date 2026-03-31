<script lang="ts">
	import { getUser, signout, changeEmail, changePassword } from '$lib/api/auth.remote';
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1 class="mb-2 font-heading text-2xl font-normal">Hi, {user.name}!</h1>
	<p class="text-text-secondary">Your user ID is {user.id}.</p>
	<form {...signout} class="mt-4">
		<Button>Sign out</Button>
	</form>

	<div class="mt-12">
		<h2 class="mb-4 font-heading text-xl font-normal">Email</h2>
		<p class="text-text-secondary">Current email: {user.email}</p>
		<p class="text-text-secondary">
			Verified: {#if user.emailVerified}Yes{:else}No{/if}
		</p>
	</div>

	<div class="mt-12">
		<h2 class="mb-4 font-heading text-xl font-normal">Change email</h2>
		<form {...changeEmail} class="flex max-w-sm flex-col gap-4">
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				New email
				<input {...changeEmail.fields.email.as('email')} class="input-field" />
			</label>
			<Button>Change email</Button>
			{#each changeEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</div>

	<div class="mt-12">
		<h2 class="mb-4 font-heading text-xl font-normal">Change password</h2>
		<form {...changePassword} class="flex max-w-sm flex-col gap-4">
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Current password
				<input {...changePassword.fields._currentPassword.as('password')} class="input-field" />
			</label>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				New password
				<input {...changePassword.fields._newPassword.as('password')} class="input-field" />
			</label>
			<Button>Change password</Button>
			{#each changePassword.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</div>

	{#snippet pending()}
		<p class="text-text-secondary">Loading...</p>
	{/snippet}
</svelte:boundary>
