<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Admin · MCU watchlist</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-5 pt-8 pb-16">
	<div class="flex items-baseline justify-between gap-4">
		<h1 class="font-display text-4xl font-extrabold tracking-title uppercase">Admin</h1>
		<a href="/" class="font-mono text-xs tracking-button text-muted uppercase hover:text-ink">
			← Watchlist
		</a>
	</div>

	<p class="mt-2 font-mono text-2xs tracking-label text-muted uppercase">
		{data.totalFilms} films
	</p>
</div>
