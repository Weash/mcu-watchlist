<script lang="ts">
	// One row for a released film: poster, title, seen/unseen toggle, rating,
	// and details. Desktop keeps the toggle, rating, and watched-date together
	// in one cluster beside the title (there's room). Mobile detaches them:
	// the icon-only toggle stays pinned next to the title, rating +
	// watched-date get their own row below it — cramming all three into one
	// line overflows on narrow widths. Duration/director sits under the
	// title; description + recap are a full-width block at the bottom of the
	// row, under the poster too.
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { FilmRow } from '../routes/+page.server';
	import Stars from '$lib/Stars.svelte';

	interface Props {
		film: FilmRow;
		phaseColor: string;
		dateFormatter: Intl.DateTimeFormat;
		onEnlarge: () => void;
		submitToggle: SubmitFunction;
	}

	let { film, phaseColor, dateFormatter, onEnlarge, submitToggle }: Props = $props();
</script>

{#snippet poster()}
	{#if film.posterUrl}
		<button
			type="button"
			onclick={onEnlarge}
			aria-label="View poster for {film.title}"
			class="flex-none cursor-pointer rounded-[3px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
		>
			<img
				src={film.posterUrl}
				alt=""
				class="aspect-[2/3] w-12 rounded-[3px] object-cover {film.seen ? 'opacity-55' : ''}"
			/>
		</button>
	{:else}
		<img
			src="/poster-fallback.svg"
			alt=""
			class="aspect-[2/3] w-12 flex-none rounded-[3px] object-contain {film.seen
				? 'opacity-55'
				: ''}"
		/>
	{/if}
{/snippet}

{#snippet titleLine()}
	<span
		class="min-w-0 flex-1 font-display text-xl leading-rowtitle font-bold uppercase {film.seen
			? 'text-muted'
			: 'text-ink'}"
	>
		{film.title}<span class="ml-2 font-mono text-xs font-normal tracking-normal text-muted normal-case">
			{film.year}
		</span>
	</span>
{/snippet}

<!-- Icon-only toggle — same size and shape whether it's marking seen or
     unmarking, so it never shifts as state changes. -->
{#snippet toggleButton()}
	<form method="POST" action="?/toggle" use:enhance={submitToggle} class="flex-none">
		<input type="hidden" name="filmId" value={film.id} />
		<input type="hidden" name="next" value={String(!film.seen)} />
		<button
			type="submit"
			aria-pressed={film.seen}
			aria-label="Mark {film.title} as {film.seen ? 'not seen' : 'seen'}"
			class="flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-current transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
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
		</button>
	</form>
{/snippet}

{#snippet ratingInfo()}
	<Stars filmId={film.id} rating={film.rating} color={phaseColor} />
	{#if film.watchedAt}
		<span class="font-mono text-2xs text-muted">
			{dateFormatter.format(new Date(film.watchedAt))}
		</span>
	{/if}
{/snippet}

{#snippet detailsLine()}
	<div class="mt-1 font-mono text-2xs tracking-tag text-muted uppercase">
		{film.duration} MIN / DIR. {film.director}
		{#if film.seen}
			· {film.postCreditsScenes === 0
				? 'No post-credits scene'
				: `${film.postCreditsScenes} post-credits scene${film.postCreditsScenes === 1 ? '' : 's'}`}
		{/if}
	</div>
{/snippet}

<div class="border-b border-rule py-2.5 pr-1" style:color={phaseColor}>
	<!-- Below sm: toggle stays beside the title; rating + watched-date get
	     their own row so they never crowd the title into wrapping. -->
	<div class="sm:hidden">
		<div class="flex items-start gap-3">
			{@render poster()}
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					{@render titleLine()}
					{@render toggleButton()}
				</div>
				{#if film.seen}
					<div class="mt-1 flex flex-wrap items-center gap-2">
						{@render ratingInfo()}
					</div>
				{/if}
				{@render detailsLine()}
			</div>
		</div>
	</div>

	<!-- sm and up: toggle, rating, and watched-date share one cluster beside
	     the title — there's room, so keeping them together reads as one unit. -->
	<div class="hidden items-start gap-3 sm:flex">
		{@render poster()}
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				{@render titleLine()}
				<div class="flex flex-none flex-nowrap items-center gap-2">
					{#if film.seen}
						{@render ratingInfo()}
					{/if}
					{@render toggleButton()}
				</div>
			</div>
			{@render detailsLine()}
		</div>
	</div>

	<div class="mt-2">
		<p class="text-sm leading-snug text-body" class:opacity-55={film.seen}>{film.description}</p>

		{#if film.seen}
			<details class="group mt-1.5 max-w-prose">
				<summary
					class="inline-block cursor-pointer rounded-t-xs border border-rule px-2 py-1 font-mono text-2xs tracking-button text-muted uppercase select-none hover:text-ink group-open:rounded-b-none group-open:border-b-transparent"
				>
					Show recap
				</summary>
				<p class="-mt-px rounded-b-xs rounded-tr-xs border border-rule p-2.5 text-sm leading-snug text-body">
					{film.recap}
				</p>
			</details>
		{/if}
	</div>
</div>
