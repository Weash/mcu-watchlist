<script lang="ts">
	// The film detail sheet: recap, facts, and a rating, reached by tapping
	// anywhere on a row but its tick. Built on <dialog> like the other
	// overlays in this app — Escape and backdrop click close it for free,
	// and focus is trapped/restored by the browser.
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { FilmRow } from '../routes/+page.server';
	import Stars from '$lib/Stars.svelte';

	interface SheetFilm extends FilmRow {
		phaseColor: string;
		phase: number;
		saga: string;
	}

	interface Props {
		film: SheetFilm | null;
		dateFormatter: Intl.DateTimeFormat;
		onClose: () => void;
		submitMarkSeen: SubmitFunction;
		submitMarkUnseen: SubmitFunction;
		onRated: (rating: number) => void;
		onRatingError: () => void;
	}

	let { film, dateFormatter, onClose, submitMarkSeen, submitMarkUnseen, onRated, onRatingError }: Props =
		$props();

	let dialogEl = $state<HTMLDialogElement>();

	$effect(() => {
		if (film !== null) dialogEl?.showModal();
		else dialogEl?.close();
	});

	/** Dismiss on a click that lands on the dialog's own backdrop area. */
	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) dialogEl?.close();
	}

	function pcLabel(n: number) {
		return n === 0 ? 'None' : `${n} scene${n === 1 ? '' : 's'}`;
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={onBackdropClick}
	class="fixed inset-x-0 top-auto bottom-0 mx-auto mt-0 mb-0 max-h-[86vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl border-0 bg-surface p-0 text-ink backdrop:bg-[rgba(4,7,15,0.66)]"
>
	{#if film}
		<div class="border-t-[3px] px-5 pt-2.5 pb-5" style:border-color={film.phaseColor}>
			<div class="mx-auto mb-3.5 h-1 w-[38px] rounded-full bg-control-border"></div>

			<div class="flex items-start gap-[13px]" style:color={film.phaseColor}>
				{#if film.posterUrl}
					<img
						src={film.posterUrl}
						alt=""
						class="aspect-[2/3] w-16 flex-none rounded-[3px] object-cover"
					/>
				{:else}
					<img
						src="/poster-fallback.svg"
						alt=""
						class="aspect-[2/3] w-16 flex-none rounded-[3px] object-contain"
					/>
				{/if}
				<div class="min-w-0 flex-1">
					<div class="font-mono text-2xs tracking-[0.2em] uppercase">
						Phase {film.phase} · {film.saga}
					</div>
					<div
						class="mt-1 font-display text-[30px] leading-[0.95] font-extrabold text-ink uppercase"
					>
						{film.title}
					</div>
					<div class="mt-[5px] font-mono text-2xs tracking-tag text-muted uppercase">
						{film.year} · {film.duration} min · {film.director}
					</div>
				</div>
			</div>

			{#if film.upcoming}
				<div
					class="mt-3.5 flex items-center justify-center rounded-[3px] border border-rule px-[11px] py-[9px] font-mono text-2xs tracking-button text-muted uppercase"
				>
					Not watched yet
				</div>
			{:else}
				<div
					class="mt-3.5 flex items-center gap-2.5 rounded-[3px] border border-rule px-[11px] py-[9px]"
					style:color={film.phaseColor}
				>
					<Stars
						filmId={film.id}
						rating={film.rating}
						color={film.phaseColor}
						size="size-5"
						action={film.seen ? '?/rate' : '?/confirm'}
						onSaved={onRated}
						onError={onRatingError}
					/>
					<span class="ml-auto font-mono text-2xs tracking-button text-muted uppercase">
						{film.seen && film.watchedAt
							? `Watched ${dateFormatter.format(new Date(film.watchedAt))}`
							: 'Not watched yet'}
					</span>
				</div>
			{/if}

			<div class="mt-3.5 grid grid-cols-2 gap-px border border-rule bg-rule">
				<div class="bg-surface p-[9px_10px]">
					<div class="font-mono text-2xs tracking-[0.16em] text-muted uppercase">Released</div>
					<div class="mt-[3px] text-sm">
						{dateFormatter.format(new Date(film.releaseDate + 'T00:00:00Z'))}
					</div>
				</div>
				<div class="bg-surface p-[9px_10px]">
					<div class="font-mono text-2xs tracking-[0.16em] text-muted uppercase">Post-credits</div>
					<div class="mt-[3px] text-sm">{pcLabel(film.postCreditsScenes)}</div>
				</div>
			</div>

			<div class="mt-3.5 font-mono text-2xs tracking-label text-muted uppercase">The gist</div>
			<p class="mt-1.5 text-[15px] leading-[1.45] text-body">{film.description}</p>

			<div class="mt-3.5 font-mono text-2xs tracking-label text-muted uppercase">
				Full recap · spoilers
			</div>
			<p class="mt-1.5 text-[15px] leading-[1.5] text-body">{film.recap}</p>

			{#if !film.upcoming}
				{#if film.seen}
					<form method="POST" action="?/toggle" use:enhance={submitMarkUnseen} class="mt-4">
						<input type="hidden" name="filmId" value={film.id} />
						<input type="hidden" name="next" value="false" />
						<button
							type="submit"
							class="w-full cursor-pointer rounded-[3px] bg-ink py-3 font-mono text-[11px] tracking-[0.14em] text-paper uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
						>
							Mark as not seen
						</button>
					</form>
				{:else}
					<form method="POST" action="?/confirm" use:enhance={submitMarkSeen} class="mt-4">
						<input type="hidden" name="filmId" value={film.id} />
						<button
							type="submit"
							class="w-full cursor-pointer rounded-[3px] bg-ink py-3 font-mono text-[11px] tracking-[0.14em] text-paper uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
						>
							Mark as seen
						</button>
					</form>
				{/if}
			{/if}
		</div>
	{/if}
</dialog>
