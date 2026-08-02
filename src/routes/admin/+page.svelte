<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import PhaseField from '$lib/PhaseField.svelte';
	import { phaseColor } from '$lib/phases';

	let { data, form } = $props();

	/**
	 * The Add form starts on the current phase and its saga: a new film is
	 * essentially always in the phase Marvel is in, so the common case is a
	 * form you fill in two fields of.
	 *
	 * `untrack` because these are the starting point, not a mirror — a reload
	 * after adding a film must not yank the fields out from under a half-typed
	 * second one.
	 */
	let phase = $state(untrack(() => data.current?.phase ?? 1));
	let saga = $state(untrack(() => data.current?.saga ?? ''));

	const dateFormatter = new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});

	const fmt = (iso: string) => dateFormatter.format(new Date(`${iso}T00:00:00Z`));

	const today = new Date().toISOString().slice(0, 10);
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
		{data.films.length} films
	</p>

	{#if data.deleted}
		<p class="mt-4 rounded-xs border border-rule px-3 py-2 font-mono text-xs text-muted" role="status">
			Deleted {data.deleted}.
		</p>
	{/if}

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

	<h2
		class="mt-8 border-b-2 border-ink pb-1.5 font-mono text-2xs tracking-label text-muted uppercase"
	>
		Add a film
	</h2>

	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ result, update }) => {
				await update();
				// A successful add resets the form, so put the defaults back
				// rather than leaving it on phase 1 with an empty saga.
				if (result.type === 'success') {
					phase = data.current?.phase ?? 1;
					saga = data.current?.saga ?? '';
				}
			}}
	>
		<label class="mt-5 flex flex-col gap-1">
			<span class="font-mono text-2xs tracking-label text-muted uppercase">Title</span>
			<input
				name="title"
				required
				maxlength="200"
				class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			/>
		</label>

		<label class="mt-4 flex flex-col gap-1">
			<span class="font-mono text-2xs tracking-label text-muted uppercase">Release date</span>
			<input
				name="releaseDate"
				type="date"
				required
				class="w-48 rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			/>
			<span class="font-mono text-2xs tracking-note text-muted">
				US theatrical. A date after {fmt(today)} renders the film as upcoming.
			</span>
		</label>

		<PhaseField sagaByPhase={data.sagaByPhase} bind:phase bind:saga />

		<label class="mt-4 flex flex-col gap-1">
			<span class="font-mono text-2xs tracking-label text-muted uppercase">Description</span>
			<textarea
				name="description"
				required
				rows="2"
				maxlength="300"
				class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			></textarea>
			<span class="font-mono text-2xs tracking-note text-muted">
				One line, present tense, no spoilers past the premise.
			</span>
		</label>

		<button
			type="submit"
			class="mt-5 rounded-xs border border-ink bg-ink px-3 py-2 font-mono text-xs tracking-button text-paper uppercase hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
		>
			Add film
		</button>
	</form>

	<h2
		class="mt-10 border-b-2 border-ink pb-1.5 font-mono text-2xs tracking-label text-muted uppercase"
	>
		Catalogue
	</h2>

	<ul class="divide-y divide-rule">
		{#each data.films as film (film.id)}
			<li>
				<a
					href="/admin/{film.id}"
					class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 pr-1 hover:bg-rule/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
				>
					<span
						class="font-display text-lg leading-none font-extrabold"
						style:color={phaseColor(film.phase)}
					>
						{String(film.phase).padStart(2, '0')}
					</span>
					<span class="font-display text-lg leading-rowtitle font-bold uppercase">
						{film.title}
					</span>
					<span class="ml-auto font-mono text-xs text-muted">
						{fmt(film.releaseDate)}
					</span>
				</a>
			</li>
		{/each}
	</ul>
</div>
