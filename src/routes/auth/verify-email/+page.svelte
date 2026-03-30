<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<h1>Check your email</h1>
<p>We sent a verification link to your email address. Click the link to verify your account.</p>
<a href={resolve('/auth/login')} class="text-sm text-blue-600 hover:underline">Back to login</a>
