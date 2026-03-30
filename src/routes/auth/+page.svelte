<script lang="ts">
	import { getUser, signout } from '$lib/api/auth.remote';
</script>

<svelte:boundary>
	{@const user = await getUser()}
	<h1>Hi, {user.name}!</h1>
	<p>Your user ID is {user.id}.</p>
	<form {...signout}>
		<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
			>Sign out</button
		>
	</form>

	{#snippet pending()}
		<p>Loading...</p>
	{/snippet}
</svelte:boundary>
