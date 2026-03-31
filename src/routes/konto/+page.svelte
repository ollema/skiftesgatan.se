<script lang="ts">
	import { getUser, signout, changeEmail, changePassword } from '$lib/api/auth.remote';
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1 class="mb-2 font-heading text-2xl font-normal">Hej, {user.name}!</h1>
	<p class="text-text-secondary">Ditt användar-ID är {user.id}.</p>
	<form {...signout} class="mt-4">
		<Button>Logga ut</Button>
	</form>

	<div class="mt-12">
		<h2 class="mb-4 font-heading text-xl font-normal">E-post</h2>
		<p class="text-text-secondary">Nuvarande e-post: {user.email}</p>
		<p class="text-text-secondary">
			Verifierad: {#if user.emailVerified}Ja{:else}Nej{/if}
		</p>
	</div>

	<div class="mt-12">
		<h2 class="mb-4 font-heading text-xl font-normal">Byt e-post</h2>
		<form {...changeEmail} class="flex max-w-sm flex-col gap-4">
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Ny e-post
				<input {...changeEmail.fields.email.as('email')} class="input-field" />
			</label>
			<Button>Byt e-post</Button>
			{#each changeEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</div>

	<div class="mt-12">
		<h2 class="mb-4 font-heading text-xl font-normal">Byt lösenord</h2>
		<form {...changePassword} class="flex max-w-sm flex-col gap-4">
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nuvarande lösenord
				<input {...changePassword.fields._currentPassword.as('password')} class="input-field" />
			</label>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nytt lösenord
				<input {...changePassword.fields._newPassword.as('password')} class="input-field" />
			</label>
			<Button>Byt lösenord</Button>
			{#each changePassword.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</div>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>
