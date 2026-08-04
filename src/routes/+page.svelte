<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Stars from '$lib/Stars.svelte';
	import RatingDialog from '$lib/RatingDialog.svelte';
	import PosterDialog from '$lib/PosterDialog.svelte';
	import ConfirmDialog from '$lib/ConfirmDialog.svelte';
	import MovieRow from '$lib/MovieRow.svelte';
	import HamburgerMenu from '$lib/HamburgerMenu.svelte';
	import type { FilmRow } from './+page.server';

	let { data } = $props();

	/**
	 * Optimistic overrides, keyed by film id.
	 *
	 * A tick should feel instant, so we render `overrides[id] ?? film.seen` and
	 * only drop the override once the server round-trip has landed and the load
	 * function has returned the real value. On failure we drop it immediately
	 * and surface the error the design already accounts for.
	 */
	let overrides = $state<Record<number, boolean>>({});
	let saveError = $state(false);
	let hideSeen = $state(false);

	/**
	 * Absent = expanded, matching `hideSeen` — no persistence, resets on
	 * reload.
	 */
	let collapsedPhases = $state<Record<number, boolean>>({});

	/** The film the rating dialog is open for, or null when it's closed. */
	let ratingFilmId = $state<number | null>(null);

	let resetFormEl = $state<HTMLFormElement>();
	let resetConfirmOpen = $state(false);

	function confirmReset() {
		resetConfirmOpen = false;
		resetFormEl?.requestSubmit();
	}

	/**
	 * The film whose poster is enlarged, or null when the dialog is closed.
	 * Only ever set for a film with a real `posterUrl` — the generic fallback
	 * poster isn't clickable.
	 */
	let enlargeFilmId = $state<number | null>(null);

	const isSeen = (f: FilmRow) => overrides[f.id] ?? f.seen;

	/** Phase colours live here, not in the database — they are design tokens. */
	const phaseColor = (phase: number) => `var(--color-phase-${phase})`;

	const dateFormatter = new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});

	/**
	 * The view model, recomputed whenever server data or an override changes.
	 * Counts are derived rather than stored, so an optimistic tick moves the dot
	 * map, the phase bar, and the header total together.
	 */
	const view = $derived.by(() => {
		let seenTotal = 0;

		const sagas = data.sagas.map((saga) => ({
			saga: saga.saga,
			phases: saga.phases.map((phase) => {
				const films = phase.films.map((f) => ({ ...f, seen: isSeen(f) }));
				const released = films.filter((f) => !f.upcoming);
				const seenCount = released.filter((f) => f.seen).length;
				seenTotal += seenCount;
				return {
					phase: phase.phase,
					films,
					visible: hideSeen ? films.filter((f) => !f.seen) : films,
					releasedCount: released.length,
					seenCount
				};
			})
		}));

		const pct = data.releasedCount ? Math.round((seenTotal / data.releasedCount) * 100) : 0;

		return { sagas, seenTotal, pct };
	});

	/** Every phase in order — the dot map ignores saga grouping. */
	const allPhases = $derived(view.sagas.flatMap((s) => s.phases));

	/** Looked up once per render for the rating dialog's title. */
	const filmById = $derived(
		new Map(allPhases.flatMap((p) => p.films).map((f) => [f.id, f]))
	);

	// Unticking only — deletes the watch (and any rating) via `toggle`, so a
	// re-tick always starts blank. Ticking goes through markSeen/confirmed
	// below instead, so the dialog opens instantly rather than after a round
	// trip.
	const submitToggle: SubmitFunction = ({ formData }) => {
		const id = Number(formData.get('filmId'));

		overrides[id] = false;
		saveError = false;

		return async ({ result, update }) => {
			if (result.type === 'failure' || result.type === 'error') {
				delete overrides[id];
				saveError = true;
				return;
			}
			await update({ reset: false });
			delete overrides[id];
		};
	};

	/**
	 * Opens the rating dialog the instant a film is ticked, before the tick
	 * has reached the database — the actual write happens once the dialog
	 * resolves (star click or skip), via the `?/confirm` action.
	 */
	function markSeen(filmId: number) {
		overrides[filmId] = true;
		saveError = false;
		ratingFilmId = filmId;
	}

	function clearRatingFilm() {
		if (ratingFilmId !== null) delete overrides[ratingFilmId];
		ratingFilmId = null;
	}

	function onRated() {
		clearRatingFilm();
	}

	function onRatingError() {
		clearRatingFilm();
		saveError = true;
	}

	const onSkipRating: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'failure' || result.type === 'error') {
				onRatingError();
				return;
			}
			await update({ reset: false });
			clearRatingFilm();
		};
	};

	const submitReset: SubmitFunction = () => {
		const previous = { ...overrides };
		for (const saga of data.sagas) {
			for (const phase of saga.phases) {
				for (const film of phase.films) overrides[film.id] = false;
			}
		}
		saveError = false;

		return async ({ result, update }) => {
			if (result.type === 'failure' || result.type === 'error') {
				overrides = previous;
				saveError = true;
				return;
			}
			await update({ reset: false });
			overrides = {};
		};
	};
</script>

<svelte:head>
	<title>What have you seen? · MCU watchlist</title>
</svelte:head>

<div class="pb-16">
	<div class="sticky top-0 z-10 border-b border-rule bg-paper">
		<div class="mx-auto max-w-page px-5 pt-4 pb-2.5">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-2.5">
					<svg viewBox="0 0 512 512" class="size-8 flex-none rounded-[9px]" aria-hidden="true">
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
					<div class="font-mono text-2xs tracking-label text-muted uppercase">
						Marvel Cinematic Universe · {data.totalFilms} films
					</div>
				</div>

				<HamburgerMenu
					isOwner={data.isOwner}
					{hideSeen}
					onToggleHideSeen={() => (hideSeen = !hideSeen)}
					onReset={() => (resetConfirmOpen = true)}
				/>
			</div>

			<div class="mt-3 flex flex-wrap gap-1" aria-hidden="true">
				{#each allPhases as phase (phase.phase)}
					<div class="mr-2 flex gap-[3px]" style:color={phaseColor(phase.phase)}>
						{#each phase.films as film (film.id)}
							<span
								class="size-[9px] rounded-full border-[1.5px] border-current transition-colors duration-150"
								class:bg-current={film.seen}
								class:border-dotted={film.upcoming}
								class:opacity-45={film.upcoming}
							></span>
						{/each}
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-page px-5">
		<header class="pt-4 pb-4">
			<h1 class="font-display text-6xl leading-title font-extrabold tracking-title uppercase">
				What have<br />you seen?
			</h1>

			<div class="mt-3 font-mono text-xs text-muted">
				<b class="font-semibold text-ink">{view.seenTotal}</b> of
				<b class="font-semibold text-ink">{data.releasedCount}</b> released films seen ·
				{view.pct}%
			</div>

			<form
				method="POST"
				action="?/reset"
				use:enhance={submitReset}
				bind:this={resetFormEl}
				class="hidden"
			></form>

			{#if saveError}
				<div class="mt-3 font-mono text-xs text-phase-1" role="alert">
					Couldn't save your last change. Try tapping it again.
				</div>
			{/if}
		</header>

		{#each view.sagas as saga (saga.saga)}
			{@const sagaHasVisiblePhase = saga.phases.some((phase) => phase.visible.length > 0)}
			{#if sagaHasVisiblePhase}
				<section>
					<h2
						class="mt-10 border-b-2 border-ink pb-1.5 font-mono text-2xs tracking-label text-muted uppercase"
					>
						{saga.saga}
					</h2>

					{#each saga.phases as phase (phase.phase)}
						{#if phase.visible.length > 0}
							<div class="mt-6">
								<button
									type="button"
									onclick={() =>
										(collapsedPhases[phase.phase] = !collapsedPhases[phase.phase])}
									aria-expanded={!collapsedPhases[phase.phase]}
									class="flex w-full cursor-pointer items-baseline gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
									style:color={phaseColor(phase.phase)}
								>
									<span class="font-display text-4xl leading-phasenum font-extrabold">
										{String(phase.phase).padStart(2, '0')}
									</span>
									<span class="font-display text-xl font-bold tracking-phase text-ink uppercase">
										Phase {phase.phase}
									</span>
									<span class="ml-auto font-mono text-xs text-muted">
										{phase.seenCount}/{phase.releasedCount}
									</span>
								</button>

								<div class="mt-2 mb-1.5 h-[3px] bg-rule">
									<div
										class="h-full transition-[width] duration-200"
										style:width="{phase.releasedCount
											? (phase.seenCount / phase.releasedCount) * 100
											: 0}%"
										style:background={phaseColor(phase.phase)}
									></div>
								</div>

								{#if !collapsedPhases[phase.phase]}
									{#each phase.visible as film (film.id)}
										{#snippet poster(opacityClass: string)}
											{#if film.posterUrl}
												<button
													type="button"
													onclick={() => (enlargeFilmId = film.id)}
													aria-label="View poster for {film.title}"
													class="flex-none cursor-pointer rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
												>
													<img
														src={film.posterUrl}
														alt=""
														class="aspect-[2/3] w-12 rounded-[3px] object-cover {opacityClass}"
													/>
												</button>
											{:else}
												<img
													src="/poster-fallback.svg"
													alt=""
													class="aspect-[2/3] w-12 flex-none rounded-[3px] object-contain {opacityClass}"
												/>
											{/if}
										{/snippet}

										{#if film.upcoming}
											{#snippet upcomingButton()}
												<div
													aria-hidden="true"
													class="flex size-7 flex-none items-center justify-center rounded-full border-2 border-dashed border-current opacity-50"
												></div>
											{/snippet}

											<div
												class="border-b border-rule py-2.5 pr-1"
												style:color={phaseColor(phase.phase)}
											>
												<div class="flex items-start gap-3">
													{@render poster('opacity-50')}
													<div class="min-w-0 flex-1">
														<div class="flex items-center gap-2">
															<div
																class="min-w-0 flex-1 font-display text-xl leading-rowtitle font-bold text-muted uppercase"
															>
																{film.title}
															</div>
															{@render upcomingButton()}
														</div>
														<div
															class="mt-1 font-mono text-2xs tracking-tag text-muted uppercase"
														>
															{film.duration} MIN / DIR. {film.director}
														</div>
														<span
															class="mt-1 inline-block rounded-xs border border-current px-1.5 py-0.5 font-mono text-2xs tracking-tag uppercase"
														>
															In theaters {dateFormatter.format(
																new Date(film.releaseDate + 'T00:00:00Z')
															)}
														</span>
													</div>
												</div>

												<div class="mt-2">
													<p class="text-base leading-snug text-body">{film.description}</p>
												</div>
											</div>
										{:else}
											<MovieRow
												{film}
												phaseColor={phaseColor(phase.phase)}
												{dateFormatter}
												onEnlarge={() => (enlargeFilmId = film.id)}
												onMarkSeen={() => markSeen(film.id)}
												{submitToggle}
											/>
										{/if}
									{/each}
								{/if}
							</div>
						{/if}
						{/each}
				</section>
			{/if}
		{/each}
	</div>
</div>

<RatingDialog
	filmId={ratingFilmId}
	filmTitle={ratingFilmId !== null ? (filmById.get(ratingFilmId)?.title ?? '') : ''}
	{onRated}
	onSkip={onSkipRating}
	onError={onRatingError}
/>

<PosterDialog
	posterUrl={enlargeFilmId !== null ? (filmById.get(enlargeFilmId)?.posterUrl ?? null) : null}
	filmTitle={enlargeFilmId !== null ? (filmById.get(enlargeFilmId)?.title ?? '') : ''}
	onClose={() => (enlargeFilmId = null)}
/>

<ConfirmDialog
	open={resetConfirmOpen}
	title="Reset everything?"
	message="This deletes every tick and rating you've saved, for every film — there's no undo."
	confirmLabel="Reset"
	onConfirm={confirmReset}
	onCancel={() => (resetConfirmOpen = false)}
/>
