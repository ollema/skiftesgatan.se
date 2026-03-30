<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1>Check your email</h1>
<p>If an account with that email exists, we sent a password reset link.</p>
<a href={resolve('/auth/login')} class="text-sm text-blue-600 hover:underline">Back to login</a>
