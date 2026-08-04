<script lang="ts">
	// One condensed row: a tick control and a title button. No poster here —
	// posters live in the "Up next" card and the detail sheet's header;
	// cramming a third poster placement into every row is what the redesign
	// removes. Tapping anywhere but the tick opens the detail sheet.
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { FilmRow } from '../routes/+page.server';

	interface Props {
		film: FilmRow;
		phaseColor: string;
		onOpenSheet: () => void;
		onMarkSeen: () => void;
		submitToggle: SubmitFunction;
	}

	let { film, phaseColor, onOpenSheet, onMarkSeen, submitToggle }: Props = $props();
</script>

{#snippet tick()}
	{#if film.upcoming}
		<div
			aria-hidden="true"
			class="size-[26px] flex-none rounded-[2px] border-2 border-dashed border-current opacity-50"
		></div>
	{:else if film.seen}
		<form method="POST" action="?/toggle" use:enhance={submitToggle} class="flex-none">
			<input type="hidden" name="filmId" value={film.id} />
			<input type="hidden" name="next" value="false" />
			<button
				type="submit"
				aria-pressed="true"
				aria-label="Mark {film.title} as not seen"
				class="flex size-[26px] cursor-pointer items-center justify-center rounded-[2px] border-2 border-current bg-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			>
				<svg viewBox="0 0 14 14" class="size-[11px] fill-none stroke-paper stroke-[3.5]" aria-hidden="true">
					<polyline points="2,7.5 5.5,11 12,3.5" />
				</svg>
			</button>
		</form>
	{:else}
		<button
			type="button"
			onclick={onMarkSeen}
			aria-pressed="false"
			aria-label="Mark {film.title} as seen"
			class="size-[26px] flex-none cursor-pointer rounded-[2px] border-2 border-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
		></button>
	{/if}
{/snippet}

<div
	class="flex items-center gap-[11px] border-b border-hairline py-2.5"
	style:color={phaseColor}
>
	{@render tick()}

	<button
		type="button"
		onclick={onOpenSheet}
		class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-none p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
	>
		<span
			class="min-w-0 flex-1 truncate font-display text-xl leading-rowtitle font-bold uppercase {film.seen
				? 'text-muted'
				: 'text-ink'}"
		>
			{film.title}
		</span>
		<span class="flex-none font-mono text-2xs text-muted">{film.year}</span>
		{#if film.seen && film.rating}
			<span class="flex flex-none items-center gap-[3px] font-mono text-2xs">
				<svg viewBox="0 0 16 16" class="size-[9px] fill-current" aria-hidden="true">
					<path
						d="M8 1.2l1.98 4.24 4.62.6-3.4 3.24.87 4.62L8 11.6l-4.07 2.3.87-4.62-3.4-3.24 4.62-.6z"
					/>
				</svg>
				{film.rating}
			</span>
		{/if}
		<svg viewBox="0 0 16 16" class="size-3 flex-none fill-none stroke-muted stroke-[1.6]" aria-hidden="true">
			<polyline points="6,3 11,8 6,13" />
		</svg>
	</button>
</div>
