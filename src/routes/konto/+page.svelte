<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { getUser, signout, changeName, changeEmail, changePassword } from '$lib/api/auth.remote';
	import Button from '$lib/components/Button.svelte';
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1 class="mb-2 font-heading text-2xl font-normal">Mitt konto</h1>
	<p class="mb-12 text-lg text-text-secondary">Hej, {user.name}.</p>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">Visningsnamn</h2>
		<p class="mb-6 text-text-primary">{user.name}</p>
		<form
			{...changeName.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					toast.success('Namn uppdaterat');
				} catch {
					toast.error('Kunde inte byta namn');
				}
			})}
			class="flex flex-col gap-4"
		>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Nytt visningsnamn
				<input {...changeName.fields.name.as('text')} class="input-field" />
			</label>
			<Button>Byt namn</Button>
			{#each changeName.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</section>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">E-post</h2>
		<p class="mb-6 text-text-primary">{user.email}</p>
		<form
			{...changeEmail.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					toast.success('Verifieringsmail skickat');
				} catch {
					toast.error('Kunde inte byta e-post');
				}
			})}
			class="flex flex-col gap-4"
		>
			<label class="flex flex-col gap-1 text-sm text-text-secondary">
				Ny e-post
				<input {...changeEmail.fields.email.as('email')} class="input-field" />
			</label>
			<Button>Byt e-post</Button>
			{#each changeEmail.fields.allIssues() as issue (issue.message)}
				<p class="text-sm text-error">{issue.message}</p>
			{/each}
		</form>
	</section>

	<section class="mb-12 max-w-sm">
		<h2 class="mb-6 font-heading text-xl font-normal">Lösenord</h2>
		<form
			{...changePassword.enhance(async ({ submit, form }) => {
				try {
					await submit();
					form.reset();
					toast.success('Lösenordet ändrat');
				} catch {
					toast.error('Kunde inte byta lösenord');
				}
			})}
			class="flex flex-col gap-4"
		>
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
	</section>

	<section class="border-t border-border-subtle pt-8">
		<form {...signout}>
			<Button>Logga ut</Button>
		</form>
	</section>

	{#snippet pending()}
		<p class="text-text-secondary">Laddar...</p>
	{/snippet}
</svelte:boundary>
