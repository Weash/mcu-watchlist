<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import RatingDialog from '$lib/RatingDialog.svelte';
	import ConfirmDialog from '$lib/ConfirmDialog.svelte';
	import FilmSheet from '$lib/FilmSheet.svelte';
	import MovieRow from '$lib/MovieRow.svelte';
	import HamburgerMenu from '$lib/HamburgerMenu.svelte';
	import type { FilmRow } from './+page.server';

	let { data } = $props();

	/** A film enriched with the phase/saga context its row and sheet need. */
	type ViewFilm = FilmRow & { phase: number; saga: string; phaseColor: string };

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

	/** The film the rating dialog is open for, or null when it's closed. */
	let ratingFilmId = $state<number | null>(null);

	/** The film whose detail sheet is open, or null when it's closed. */
	let detailFilmId = $state<number | null>(null);

	let resetFormEl = $state<HTMLFormElement>();
	let resetConfirmOpen = $state(false);

	function confirmReset() {
		resetConfirmOpen = false;
		resetFormEl?.requestSubmit();
	}

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
	 * Phases are flattened out of their saga wrapper here — the redesign folds
	 * the saga name into the phase heading instead of giving it its own
	 * section — but each film still carries its saga/phase/colour so the row
	 * and the detail sheet don't need to look it back up.
	 */
	const view = $derived.by(() => {
		let seenTotal = 0;
		let unseenCount = 0;
		let minutes = 0;
		let phasesDone = 0;

		const groups = data.sagas.flatMap((saga) =>
			saga.phases.map((phase) => {
				const color = phaseColor(phase.phase);
				const films: ViewFilm[] = phase.films.map((f) => {
					const seen = isSeen(f);
					if (!f.upcoming) {
						if (seen) {
							seenTotal++;
							minutes += f.duration;
						} else {
							unseenCount++;
						}
					}
					return { ...f, seen, phase: phase.phase, saga: saga.saga, phaseColor: color };
				});

				const releasedCount = films.filter((f) => !f.upcoming).length;
				const seenCount = films.filter((f) => !f.upcoming && f.seen).length;
				if (releasedCount > 0 && seenCount === releasedCount) phasesDone++;

				return {
					phase: phase.phase,
					saga: saga.saga,
					color,
					films,
					visible: hideSeen ? films.filter((f) => !f.seen) : films,
					releasedCount,
					seenCount
				};
			})
		);

		// Films arrive from the server in release order (see +page.server.ts),
		// and grouping preserves that, so this stays release-ordered too.
		const flat = groups.flatMap((g) => g.films);
		const nextUp = flat.find((f) => !f.upcoming && !f.seen) ?? null;
		const lastWatched = flat
			.filter((f) => f.seen && f.watchedAt)
			.reduce<ViewFilm | null>(
				(latest, f) => (!latest || f.watchedAt! > latest.watchedAt! ? f : latest),
				null
			);

		const pct = data.releasedCount ? Math.round((seenTotal / data.releasedCount) * 100) : 0;
		const hours = Math.round(minutes / 60);
		const visibleGroups = groups.filter((g) => g.visible.length > 0);

		return {
			groups,
			visibleGroups,
			flat,
			seenTotal,
			unseenCount,
			pct,
			hours,
			phasesDone,
			nextUp,
			lastWatched
		};
	});

	/** Looked up for the rating dialog and the detail sheet. */
	const filmById = $derived(new Map(view.flat.map((f) => [f.id, f])));
	const detailFilm = $derived(detailFilmId !== null ? (filmById.get(detailFilmId) ?? null) : null);

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
	 * resolves (star click or skip), via the `?/confirm` action. Used by the
	 * row tick and the "Up next" card, which share the same flow.
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

	/**
	 * The sheet's "Mark as seen" button — unlike a row tick, it doesn't pop
	 * the rating dialog on top of the sheet that's already open; the sheet
	 * has its own star row for that.
	 */
	const submitSheetMarkSeen: SubmitFunction = ({ formData }) => {
		const id = Number(formData.get('filmId'));

		overrides[id] = true;
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
	 * A star click inside the sheet, for a film with no watch row yet, posts
	 * `?/confirm` directly (see FilmSheet) rather than going through
	 * markSeen/RatingDialog. Once it lands, treat the film as seen the same
	 * way any other optimistic tick does.
	 */
	function onSheetRated() {
		if (detailFilmId !== null && !filmById.get(detailFilmId)?.seen) {
			overrides[detailFilmId] = true;
		}
	}

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
	<div class="sticky top-0 z-20 border-b border-rule bg-paper">
		<div class="mx-auto flex max-w-page items-center gap-2.5 px-5 pt-3.5 pb-2.5">
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
				MCU watchlist
			</div>
			<span class="flex-none font-mono text-[11px] font-semibold text-ink">
				{view.seenTotal}/{data.releasedCount}
			</span>
			<HamburgerMenu
				isOwner={data.isOwner}
				{hideSeen}
				onToggleHideSeen={() => (hideSeen = !hideSeen)}
				onReset={() => (resetConfirmOpen = true)}
			/>
		</div>
	</div>

	<div class="mx-auto max-w-page px-5">
		<div class="pt-4">
			<div class="flex items-end gap-2.5">
				<div class="font-display text-[92px] leading-[0.74] font-extrabold tracking-[-0.03em]">
					{view.pct}%
				</div>
				<div class="pb-[7px] font-mono text-2xs leading-[1.5] tracking-[0.12em] text-muted uppercase">
					of the<br />released<br />canon
				</div>
			</div>

			<div class="mt-3.5 grid grid-cols-3 gap-px border border-rule bg-rule">
				<div class="bg-paper px-[9px] py-[10px]">
					<div class="font-display text-[28px] leading-[0.85] font-extrabold">{view.seenTotal}</div>
					<div class="mt-[3px] font-mono text-2xs tracking-[0.14em] text-muted uppercase">
						Films seen
					</div>
				</div>
				<div class="bg-paper px-[9px] py-[10px]">
					<div class="font-display text-[28px] leading-[0.85] font-extrabold">{view.hours}</div>
					<div class="mt-[3px] font-mono text-2xs tracking-[0.14em] text-muted uppercase">
						Hours in
					</div>
				</div>
				<div class="bg-paper px-[9px] py-[10px]">
					<div class="font-display text-[28px] leading-[0.85] font-extrabold">
						{view.phasesDone}
					</div>
					<div class="mt-[3px] font-mono text-2xs tracking-[0.14em] text-muted uppercase">
						Phases done
					</div>
				</div>
			</div>

			{#if view.nextUp}
				{@const nextUp = view.nextUp}
				<div class="mt-4 flex min-h-[100px] items-start gap-3 rounded-[3px] border border-ink p-3">
					{#if nextUp.posterUrl}
						<img
							src={nextUp.posterUrl}
							alt=""
							class="aspect-[2/3] w-[52px] flex-none rounded-[2px] object-cover"
						/>
					{:else}
						<img
							src="/poster-fallback.svg"
							alt=""
							class="aspect-[2/3] w-[52px] flex-none rounded-[2px] object-contain"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="font-mono text-2xs tracking-label text-muted uppercase">Up next</div>
						<div class="mt-1 truncate font-display text-2xl leading-none font-bold uppercase">
							{nextUp.title}
						</div>
						<div class="mt-1 font-mono text-2xs tracking-tag text-muted uppercase">
							{nextUp.duration} MIN / DIR. {nextUp.director}
						</div>
						<button
							type="button"
							onclick={() => markSeen(nextUp.id)}
							class="mt-[9px] inline-flex cursor-pointer items-center gap-[7px] rounded-[2px] bg-ink px-[11px] py-[7px] font-mono text-2xs tracking-[0.14em] text-paper uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
						>
							<svg viewBox="0 0 14 14" class="size-[11px] fill-none stroke-current stroke-[3]" aria-hidden="true">
								<polyline points="2,7.5 5.5,11 12,3.5" />
							</svg>
							Mark as seen
						</button>
					</div>
				</div>
			{/if}

			<div class="mt-4 flex items-center gap-1.5">
				<button
					type="button"
					onclick={() => (hideSeen = false)}
					class="cursor-pointer rounded-full border px-2.5 py-1 font-mono text-2xs tracking-tag whitespace-nowrap uppercase {hideSeen
						? 'border-rule text-muted'
						: 'border-ink bg-ink text-paper'}"
				>
					All {data.totalFilms}
				</button>
				<button
					type="button"
					onclick={() => (hideSeen = true)}
					class="cursor-pointer rounded-full border px-2.5 py-1 font-mono text-2xs tracking-tag whitespace-nowrap uppercase {hideSeen
						? 'border-ink bg-ink text-paper'
						: 'border-rule text-muted'}"
				>
					Unseen {view.unseenCount}
				</button>
				{#if view.lastWatched}
					<span class="ml-auto truncate font-mono text-2xs text-muted">
						Last: {view.lastWatched.title}
					</span>
				{/if}
			</div>

			{#if saveError}
				<div class="mt-3 font-mono text-2xs text-phase-1" role="alert">
					Couldn't save your last change. Try tapping it again.
				</div>
			{/if}
		</div>

		<form method="POST" action="?/reset" use:enhance={submitReset} bind:this={resetFormEl} class="hidden"
		></form>

		{#each view.visibleGroups as group (group.phase)}
			<div class="mt-6">
				<div class="flex items-end gap-[9px]" style:color={group.color}>
					<span class="font-display text-[32px] leading-[0.78] font-extrabold">
						{String(group.phase).padStart(2, '0')}
					</span>
					<div class="min-w-0 flex-1">
						<div class="font-mono text-2xs tracking-label text-muted uppercase">{group.saga}</div>
						<div class="font-display text-[19px] font-bold tracking-phase text-ink uppercase">
							Phase {group.phase}
						</div>
					</div>
					<span class="font-mono text-[11px] text-muted">{group.seenCount}/{group.releasedCount}</span>
				</div>

				<div class="mt-1.5 h-[3px] bg-rule">
					<div
						class="h-full transition-[width] duration-200"
						style:width="{group.releasedCount ? (group.seenCount / group.releasedCount) * 100 : 0}%"
						style:background={group.color}
					></div>
				</div>

				{#each group.visible as film (film.id)}
					<MovieRow
						{film}
						phaseColor={film.phaseColor}
						onOpenSheet={() => (detailFilmId = film.id)}
						onMarkSeen={() => markSeen(film.id)}
						{submitToggle}
					/>
				{/each}
			</div>
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

<FilmSheet
	film={detailFilm}
	{dateFormatter}
	onClose={() => (detailFilmId = null)}
	submitMarkSeen={submitSheetMarkSeen}
	submitMarkUnseen={submitToggle}
	onRated={onSheetRated}
	{onRatingError}
/>

<ConfirmDialog
	open={resetConfirmOpen}
	title="Reset everything?"
	message="This deletes every tick and rating you've saved, for every film — there's no undo."
	confirmLabel="Reset"
	onConfirm={confirmReset}
	onCancel={() => (resetConfirmOpen = false)}
/>
