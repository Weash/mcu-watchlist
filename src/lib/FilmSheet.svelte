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

	// showModal() alone doesn't reliably stop the page underneath from
	// scrolling on mobile Safari, so the body is explicitly locked for as
	// long as the sheet is open. Plain `overflow: hidden` isn't enough on
	// iOS — it doesn't actually block touch scrolling — so the body is pinned
	// to its current scroll position with `position: fixed; top: -scrollY`
	// and both are restored on close, the standard workaround.
	//
	// (This lock is about background scrolling only. It was once also
	// suspected of being why the sheet opened off-screen on iPhone; it
	// wasn't — that was a flex sizing bug, see the markup below.)
	let lockedScrollY = 0;
	let scrollLocked = false;

	// Guarded by `scrollLocked` because the effect below returns `unlockScroll`
	// as its cleanup, which Svelte runs before every re-run — not just on
	// unmount. Without the guard, opening the sheet would fire an unlock
	// (and an unwanted scrollTo) left over from the previous close.
	function lockScroll() {
		if (scrollLocked) return;
		scrollLocked = true;
		lockedScrollY = window.scrollY;
		document.body.style.position = 'fixed';
		document.body.style.top = `-${lockedScrollY}px`;
		document.body.style.left = '0';
		document.body.style.right = '0';
	}

	function unlockScroll() {
		if (!scrollLocked) return;
		scrollLocked = false;
		document.body.style.position = '';
		document.body.style.top = '';
		document.body.style.left = '';
		document.body.style.right = '';
		window.scrollTo(0, lockedScrollY);
	}

	$effect(() => {
		if (film !== null) {
			lockScroll();
			dialogEl?.showModal();
		} else {
			dialogEl?.close();
			unlockScroll();
		}
		return unlockScroll;
	});

	/** Dismiss on a click that lands on the dialog's own backdrop area. */
	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) dialogEl?.close();
	}

	function pcLabel(n: number) {
		return n === 0 ? 'None' : `${n} scene${n === 1 ? '' : 's'}`;
	}

	/**
	 * Swipe-to-dismiss, via a dedicated handle rather than the sheet body.
	 *
	 * The handle sits outside the sheet's own scrollable area (see the
	 * markup) and carries a permanent `touch-none`. That matters: a
	 * browser decides whether a touch becomes a native scroll/pan at
	 * `touchstart`, based on the *static* touch-action of the element it
	 * lands on — flipping touch-action from JS in `pointermove` is too
	 * late once the sheet itself is the thing being touched, which is why
	 * dragging used to get swallowed as a scroll instead of reaching here.
	 */
	let dragOffset = $state(0);
	let dragging = $state(false);
	let dragStartY = 0;

	function onHandlePointerDown(e: PointerEvent) {
		dragging = true;
		dragStartY = e.clientY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onHandlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		const delta = e.clientY - dragStartY;
		dragOffset = Math.max(0, delta);
	}

	function endDrag() {
		if (!dragging) return;
		dragging = false;
		if (dragOffset > 100) {
			dialogEl?.close();
		}
		dragOffset = 0;
	}
</script>

<!--
	The dialog is only a full-viewport transparent shell; the panel inside it is
	the visible sheet. Two things about this element are load-bearing:

	1. No `display` utility. A closed dialog is hidden by the UA's
	   `dialog:not([open]) { display: none }`, and author styles beat UA styles
	   whatever their specificity — so a `flex`/`block` class here would apply
	   while closed too, leaving an invisible full-viewport box over the page
	   that swallows every tap and makes the app look frozen. Layout inside is
	   done by positioning the panel absolutely instead.

	2. `h-auto`/`w-auto` + `max-*-none` to undo the UA's `fit-content` sizing and
	   `max-height: calc(100% - 6px - 2em)`, so `inset-0` really does fill the
	   viewport and give the panel a definite height to size against.
-->
<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={onBackdropClick}
	class="fixed inset-0 m-0 h-auto max-h-none w-auto max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-[rgba(4,7,15,0.66)]"
>
	{#if film}
		<!--
			The panel's height is a definite 86% of the dialog (i.e. of the viewport)
			rather than being grown from its content, and that is the actual iPhone
			fix.

			It used to be the dialog itself, sized `top: auto; bottom: 0` with
			`max-h-[86vh]`, so its height came from its content — an auto-height
			column flex container whose body child was `flex-1`, i.e.
			`flex-basis: 0%`. Chrome sizes such a child from its content when
			computing the container's intrinsic height; Safari resolves the basis to
			0, so the whole thing collapsed to just the non-flexing drag handle and
			`overflow-hidden` clipped the rest. That is why the sheet opened as a
			~45px strip at the bottom of an iPhone while desktop Chrome looked fine
			at the same width.

			With the height definite, nothing depends on intrinsic flex sizing and
			`flex-1` on the body below behaves the same in both engines.
		-->
		<div
			class="absolute inset-x-0 bottom-0 mx-auto flex h-[86%] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-surface"
			style:transform={dragOffset ? `translateY(${dragOffset}px)` : ''}
			class:transition-transform={!dragging}
			style:transition-duration={dragging ? '0ms' : '150ms'}
		>
			<div
				role="presentation"
				class="flex-none touch-none border-t-[3px] px-5 pt-2.5 pb-3.5"
				style:border-color={film.phaseColor}
				onpointerdown={onHandlePointerDown}
				onpointermove={onHandlePointerMove}
				onpointerup={endDrag}
				onpointercancel={endDrag}
			>
				<div class="mx-auto h-1 w-[38px] rounded-full bg-control-border"></div>
			</div>

			<div
				class="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))]"
			>
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
		</div>
	{/if}
</dialog>
