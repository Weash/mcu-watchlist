<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
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

	const submitToggle: SubmitFunction = ({ formData }) => {
		const id = Number(formData.get('filmId'));
		const next = formData.get('next') === 'true';

		overrides[id] = next;
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
	<div class="mx-auto max-w-page px-5">
		<header class="pt-8 pb-4">
			<div class="flex items-center justify-between gap-3">
				<div class="font-mono text-2xs tracking-label text-muted uppercase">
					Marvel Cinematic Universe · {data.totalFilms} films
				</div>

				{#if data.isOwner}
					<a
						href="/admin"
						title="Admin"
						aria-label="Admin"
						class="-m-1.5 p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					>
						<svg
							viewBox="0 0 16 16"
							class="size-5 fill-none stroke-current stroke-[1.5]"
							aria-hidden="true"
						>
							<circle cx="8" cy="8" r="2.25" />
							<path
								d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4"
							/>
						</svg>
					</a>
				{/if}
			</div>

			<h1 class="mt-1.5 font-display text-6xl leading-title font-extrabold tracking-title uppercase">
				What have<br />you seen?
			</h1>

			<div class="mt-3.5 mb-1 flex flex-wrap gap-1" aria-hidden="true">
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

			<div class="mt-3 font-mono text-xs text-muted">
				<b class="font-semibold text-ink">{view.seenTotal}</b> of
				<b class="font-semibold text-ink">{data.releasedCount}</b> released films seen ·
				{view.pct}%
			</div>

			<div class="mt-4 flex items-center justify-between gap-3 border-t border-rule pt-3.5 pb-1">
				<button
					type="button"
					onclick={() => (hideSeen = !hideSeen)}
					aria-pressed={hideSeen}
					class="rounded-xs border px-3 py-2 font-mono text-xs tracking-button uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3 {hideSeen
						? 'border-ink bg-ink text-paper'
						: 'border-rule text-muted hover:border-ink hover:text-ink'}"
				>
					{hideSeen ? 'Showing unseen only' : "Hide what I've seen"}
				</button>

				<form method="POST" action="?/reset" use:enhance={submitReset}>
					<button
						type="submit"
						class="rounded-xs border border-rule px-3 py-2 font-mono text-xs tracking-button text-muted uppercase transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					>
						Reset
					</button>
				</form>
			</div>

			{#if saveError}
				<div class="mt-3 font-mono text-xs text-phase-1" role="alert">
					Couldn't save your last change. Try tapping it again.
				</div>
			{/if}
		</header>

		{#each view.sagas as saga (saga.saga)}
			<section>
				<h2
					class="mt-10 border-b-2 border-ink pb-1.5 font-mono text-2xs tracking-label text-muted uppercase"
				>
					{saga.saga}
				</h2>

				{#each saga.phases as phase (phase.phase)}
					<div class="mt-6">
						<div class="flex items-baseline gap-2.5" style:color={phaseColor(phase.phase)}>
							<span class="font-display text-4xl leading-phasenum font-extrabold">
								{String(phase.phase).padStart(2, '0')}
							</span>
							<span class="font-display text-xl font-bold tracking-phase text-ink uppercase">
								Phase {phase.phase}
							</span>
							<span class="ml-auto font-mono text-xs text-muted">
								{phase.seenCount}/{phase.releasedCount}
							</span>
						</div>

						<div class="mt-2 mb-1.5 h-[3px] bg-rule">
							<div
								class="h-full transition-[width] duration-200"
								style:width="{phase.releasedCount
									? (phase.seenCount / phase.releasedCount) * 100
									: 0}%"
								style:background={phaseColor(phase.phase)}
							></div>
						</div>

						{#if phase.visible.length === 0}
							<div class="py-3.5 text-sm text-muted">All caught up on this phase.</div>
						{/if}

						{#each phase.visible as film (film.id)}
							{#if film.upcoming}
								<div
									class="flex w-full items-start gap-3 border-b border-rule py-2.5 pr-1"
									style:color={phaseColor(phase.phase)}
								>
									<div
										class="mt-0.5 size-5 flex-none rounded-[3px] border-2 border-dotted border-current opacity-50"
									></div>
									<div>
										<div class="font-display text-xl leading-rowtitle font-bold text-muted uppercase">
											{film.title}
										</div>
										<div class="mt-0.5 text-sm leading-snug text-body">
											{film.description}
										</div>
										<span
											class="mt-1 inline-block rounded-xs border border-current px-1.5 py-0.5 font-mono text-2xs tracking-tag uppercase"
										>
											In theaters {dateFormatter.format(new Date(film.releaseDate + 'T00:00:00Z'))}
										</span>
									</div>
								</div>
							{:else}
								<form method="POST" action="?/toggle" use:enhance={submitToggle}>
									<input type="hidden" name="filmId" value={film.id} />
									<input type="hidden" name="next" value={String(!film.seen)} />
									<button
										type="submit"
										aria-pressed={film.seen}
										class="flex w-full cursor-pointer items-start gap-3 border-b border-rule py-2.5 pr-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
										style:color={phaseColor(phase.phase)}
									>
										<span
											class="mt-0.5 flex size-5 flex-none items-center justify-center rounded-[3px] border-2 border-current"
											class:bg-current={film.seen}
										>
											{#if film.seen}
												<svg
													viewBox="0 0 14 14"
													class="size-3 fill-none stroke-paper stroke-[3.5]"
													aria-hidden="true"
												>
													<polyline points="2,7.5 5.5,11 12,3.5" />
												</svg>
											{/if}
										</span>
										<span>
											<span
												class="font-display text-xl leading-rowtitle font-bold uppercase {film.seen
													? 'text-muted'
													: 'text-ink'}"
											>
												{film.title}<span
													class="ml-2 font-mono text-xs font-normal tracking-normal text-muted normal-case"
												>
													{film.year}
												</span>
											</span>
											<span
												class="mt-0.5 block text-sm leading-snug text-body"
												class:opacity-55={film.seen}
											>
												{film.description}
											</span>
										</span>
									</button>
								</form>
							{/if}
						{/each}
					</div>
				{/each}
			</section>
		{/each}

		<div class="mt-7 text-center font-mono text-2xs tracking-note text-muted">
			Your ticks are saved automatically.
		</div>
	</div>
</div>
