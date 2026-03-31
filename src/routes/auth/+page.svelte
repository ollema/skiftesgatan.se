<script lang="ts">
	import { getUser, signout, changeEmail, changePassword } from '$lib/api/auth.remote';
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1>Hi, {user.name}!</h1>
	<p>Your user ID is {user.id}.</p>
	<form {...signout}>
		<Button>Sign out</Button>
	</form>

	<div class="mt-8">
		<h2>Email</h2>
		<p>Current email: {user.email}</p>
		<p>
			Verified: {#if user.emailVerified}Yes{:else}No{/if}
		</p>
	</div>

	<div class="mt-8">
		<h2>Change email</h2>
		<form {...changeEmail}>
			<label>
				New email
				<input
					{...changeEmail.fields.email.as('email')}
					class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</label>
			<Button>Change email</Button>
			{#each changeEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-red-500">{issue.message}</p>
			{/each}
		</form>
	</div>

	<div class="mt-8">
		<h2>Change password</h2>
		<form {...changePassword}>
			<label>
				Current password
				<input
					{...changePassword.fields._currentPassword.as('password')}
					class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</label>
			<label>
				New password
				<input
					{...changePassword.fields._newPassword.as('password')}
					class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				/>
			</label>
			<Button>Change password</Button>
			{#each changePassword.fields.allIssues() as issue (issue.message)}
				<p class="text-red-500">{issue.message}</p>
			{/each}
		</form>
	</div>

	{#snippet pending()}
		<p>Loading...</p>
	{/snippet}
</svelte:boundary>
