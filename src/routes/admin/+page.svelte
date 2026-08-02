<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Admin · MCU watchlist</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-5 pt-8 pb-16">
	<div class="flex items-baseline justify-between gap-4">
		<h1 class="font-display text-4xl font-extrabold tracking-title uppercase">Admin</h1>
		<a
			href="/"
			class="font-mono text-xs tracking-button text-muted uppercase hover:text-ink"
		>
			← Watchlist
		</a>
	</div>

	<p class="mt-2 font-mono text-2xs tracking-label text-muted uppercase">
		{data.totalFilms} films · {data.pending.length} pending
	</p>

	{#snippet syncAge(iso: string)}
		{@const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)}
		<span class:text-phase-1={days > 10}>
			{days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`}
		</span>
	{/snippet}

	<p class="mt-1 font-mono text-2xs tracking-label text-muted uppercase">
		{#if data.lastSyncAt}
			Last sync {@render syncAge(data.lastSyncAt)}
		{:else}
			<span class="text-phase-1">Never synced</span>
		{/if}
	</p>

	{#if form?.message}
		<p
			class="mt-4 rounded-xs border px-3 py-2 font-mono text-xs {form.ok
				? 'border-phase-5 text-phase-5'
				: 'border-phase-1 text-phase-1'}"
			role="status"
		>
			{form.message}
		</p>
	{/if}

	<h2 class="mt-8 border-b-2 border-ink pb-1.5 font-mono text-2xs tracking-label text-muted uppercase">
		Discoveries
	</h2>

	{#if data.pending.length === 0}
		<p class="py-6 text-sm text-muted">
			Nothing pending. The weekly sync lists anything tagged as MCU on TMDB that isn't already in
			the catalogue — it never adds films by itself, because that tag is community-maintained and
			picks up specials, documentaries and mistags.
		</p>
	{:else}
		<ul class="divide-y divide-rule">
			{#each data.pending as d (d.tmdbId)}
				<li class="py-4">
					<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<h3 class="font-display text-xl leading-rowtitle font-bold uppercase">
							{d.title}
						</h3>
						<span class="font-mono text-xs text-muted">
							{d.releaseDate ?? 'no release date'} · {d.mediaType} · tmdb {d.tmdbId}
						</span>
					</div>

					{#if d.overview}
						<p class="mt-1 text-sm leading-snug text-body">{d.overview}</p>
					{/if}

					<div class="mt-3 flex flex-wrap items-end gap-3">
						<form method="POST" action="?/add" use:enhance class="flex flex-wrap items-end gap-3">
							<input type="hidden" name="tmdbId" value={d.tmdbId} />

							<label class="flex flex-col gap-1">
								<span class="font-mono text-2xs tracking-label text-muted uppercase">Phase</span>
								<input
									name="phase"
									type="number"
									min="1"
									max="12"
									required
									class="w-20 rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
								/>
							</label>

							<label class="flex flex-col gap-1">
								<span class="font-mono text-2xs tracking-label text-muted uppercase">Saga</span>
								<input
									name="saga"
									list="sagas"
									required
									class="w-64 rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
								/>
							</label>

							<button
								type="submit"
								class="rounded-xs border border-ink bg-ink px-3 py-2 font-mono text-xs tracking-button text-paper uppercase hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
							>
								Add
							</button>
						</form>

						<form method="POST" action="?/ignore" use:enhance>
							<input type="hidden" name="tmdbId" value={d.tmdbId} />
							<button
								type="submit"
								class="rounded-xs border border-rule px-3 py-2 font-mono text-xs tracking-button text-muted uppercase hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
							>
								Ignore
							</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>

		<datalist id="sagas">
			{#each data.sagas as saga (saga)}
				<option value={saga}></option>
			{/each}
		</datalist>
	{/if}

	<p class="mt-8 font-mono text-2xs leading-relaxed tracking-note text-muted">
		Phase and saga are editorial — TMDB has no concept of either, so the sync never sets or changes
		them. A newly added film starts with no description; the next sync writes one in the
		established voice.
	</p>
</div>
