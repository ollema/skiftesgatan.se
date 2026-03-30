<script lang="ts">
	import { getTasks, createTask, deleteTask } from '$lib/api/tasks.remote';
</script>

<svelte:boundary>
	<h1>Tasks</h1>

	<form {...createTask}>
		<label>
			Title
			<input {...createTask.fields.title.as('text')} />
		</label>

		<label>
			Priority (1-5)
			<input {...createTask.fields.priority.as('number')} />
		</label>

		<button>Add task</button>

		{#each createTask.fields.allIssues() as issue (issue.message)}
			<p class="text-red-500">{issue.message}</p>
		{/each}
	</form>

	<ul>
		{#each await getTasks() as t (t.id)}
			<li>
				<span>{t.title} (priority: {t.priority})</span>
				<button onclick={() => deleteTask(t.id)}>delete</button>
			</li>
		{/each}
	</ul>

	{#snippet pending()}
		<p>Loading...</p>
	{/snippet}

	{#snippet failed(error)}
		<p class="text-red-500">Error: {String(error)}</p>
	{/snippet}
</svelte:boundary>
