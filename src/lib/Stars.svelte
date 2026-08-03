<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	/**
	 * Five star buttons wired to the `rate` action.
	 *
	 * One `<form>` per star rather than one form with a hidden field the
	 * button overrides, so each star works with JavaScript off too — clicking
	 * one just submits its own value.
	 *
	 * The only place that writes a rating, whether it's clicked from the
	 * dialog right after a tick or directly in an already-watched row.
	 */
	interface Props {
		filmId: number;
		rating: number | null;
		color?: string | null;
		onSaved?: (rating: number) => void;
	}

	let { filmId, rating, color = null, onSaved }: Props = $props();

	/** Optimistic value while a click is in flight; falls back to the prop. */
	let pending = $state<number | null>(null);
	const display = $derived(pending ?? rating ?? 0);

	function submitRating(value: number): SubmitFunction {
		return () => {
			pending = value;

			return async ({ result, update }) => {
				if (result.type === 'failure' || result.type === 'error') {
					pending = null;
					return;
				}
				await update({ reset: false });
				pending = null;
				onSaved?.(value);
			};
		};
	}
</script>

<div class="flex gap-0.5" style:color={color}>
	{#each [1, 2, 3, 4, 5] as star (star)}
		<form method="POST" action="?/rate" use:enhance={submitRating(star)}>
			<input type="hidden" name="filmId" value={filmId} />
			<input type="hidden" name="rating" value={star} />
			<button
				type="submit"
				aria-label="Rate {star} star{star === 1 ? '' : 's'}"
				class="cursor-pointer rounded-xs p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			>
				<svg viewBox="0 0 16 16" class="size-3.5" aria-hidden="true">
					<path
						d="M8 1.2l1.98 4.24 4.62.6-3.4 3.24.87 4.62L8 11.6l-4.07 2.3.87-4.62-3.4-3.24 4.62-.6z"
						class="stroke-current"
						fill={star <= display ? 'currentColor' : 'none'}
						stroke-width="1"
					/>
				</svg>
			</button>
		</form>
	{/each}
</div>
