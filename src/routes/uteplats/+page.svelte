<script lang="ts">
	import { MetaTags } from 'svelte-meta-tags';
	import { metaDefaults } from '$lib/meta';
	import BookingPage from '$lib/components/BookingPage.svelte';
</script>

<MetaTags
	{...metaDefaults}
	title="Uteplats"
	description="Boka den gemensamma uteplatsen."
	robots="noindex,nofollow"
/>

<BookingPage resource="outdoor_area" />
