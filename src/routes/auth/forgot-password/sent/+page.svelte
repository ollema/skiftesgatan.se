<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1 class="mb-4 font-heading text-2xl font-normal">Check your email</h1>
<p class="mb-6 text-text-secondary">
	If an account with that email exists, we sent a password reset link.
</p>
<a href={resolve('/auth/login')} class="text-sm">Back to login</a>
