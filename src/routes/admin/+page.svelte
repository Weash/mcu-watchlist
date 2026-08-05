<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import PhaseField from '$lib/PhaseField.svelte';
	import HamburgerMenu from '$lib/HamburgerMenu.svelte';
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

<div class="pb-16">
	<div class="sticky top-0 z-20 border-b border-rule bg-paper">
		<div class="mx-auto flex max-w-3xl items-center gap-2.5 px-5 pt-3.5 pb-2.5">
			<svg viewBox="0 0 512 512" class="size-[26px] flex-none rounded-[7px]" aria-hidden="true">
				<rect width="512" height="512" rx="112" fill="var(--color-ink)" />
				<circle cx="133" cy="189" r="42" fill="var(--color-phase-1)" />
				<circle cx="256" cy="189" r="42" fill="var(--color-phase-2)" />
				<circle cx="379" cy="189" r="42" fill="var(--color-phase-3)" />
				<circle cx="133" cy="325" r="42" fill="var(--color-phase-4)" />
				<circle cx="256" cy="325" r="42" fill="var(--color-phase-5)" />
				<circle
					cx="379"
					cy="325"
					r="40"
					fill="none"
					stroke="var(--color-phase-6)"
					stroke-width="9"
					stroke-dasharray="10 9.5"
					stroke-linecap="round"
				/>
			</svg>
			<div class="min-w-0 flex-1 truncate font-mono text-2xs tracking-label text-muted uppercase">
				MCU watchlist · Admin
			</div>
			<a
				href="/"
				class="flex-none font-mono text-xs tracking-button text-muted uppercase hover:text-ink"
			>
				← Watchlist
			</a>
			<HamburgerMenu />
		</div>
	</div>

	<div class="mx-auto max-w-3xl px-5 pt-8">
		<h1 class="font-display text-4xl font-extrabold tracking-title uppercase">Admin</h1>

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
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				/>
			</label>

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Release date</span>
				<input
					name="releaseDate"
					type="date"
					required
					class="w-48 rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
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
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				></textarea>
				<span class="font-mono text-2xs tracking-note text-muted">
					One line, present tense, no spoilers past the premise.
				</span>
			</label>

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Poster URL</span>
				<input
					name="posterUrl"
					type="url"
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				/>
				<span class="font-mono text-2xs tracking-note text-muted">
					A Wikipedia image link. No upload — paste the URL. Optional: leave blank to show a
					placeholder until you have one.
				</span>
			</label>

			<div class="mt-4 flex gap-3">
				<label class="flex flex-1 flex-col gap-1">
					<span class="font-mono text-2xs tracking-label text-muted uppercase">
						Duration (min)
					</span>
					<input
						name="duration"
						type="number"
						min="1"
						required
						class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					/>
				</label>

				<label class="flex flex-1 flex-col gap-1">
					<span class="font-mono text-2xs tracking-label text-muted uppercase">Director</span>
					<input
						name="director"
						required
						class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					/>
				</label>

				<label class="flex flex-1 flex-col gap-1">
					<span class="font-mono text-2xs tracking-label text-muted uppercase">
						Post-credits scenes
					</span>
					<input
						name="postCreditsScenes"
						type="number"
						min="0"
						required
						class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					/>
				</label>
			</div>

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Recap</span>
				<textarea
					name="recap"
					required
					rows="4"
					maxlength="1500"
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				></textarea>
				<span class="font-mono text-2xs tracking-note text-muted">
					Full plot, present tense, spoilers included. Only shown once a viewer has ticked the
					film seen.
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
</div>
