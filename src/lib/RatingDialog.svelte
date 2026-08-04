<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Stars from './Stars.svelte';

	/**
	 * Opens the instant a film is ticked seen — before the tick has even
	 * reached the database. The only ways out are a star click or "I'm not
	 * sure yet", both of which write the watch (and rating, if any) in one
	 * `?/confirm` call. No backdrop click, no Escape — a tick always ends
	 * with an explicit choice, not an accidental dismissal that leaves the
	 * viewer unsure whether it saved.
	 */
	interface Props {
		filmId: number | null;
		filmTitle: string;
		onRated: (rating: number) => void;
		onSkip: SubmitFunction;
		onError: () => void;
	}

	let { filmId, filmTitle, onRated, onSkip, onError }: Props = $props();

	let dialogEl = $state<HTMLDialogElement>();

	$effect(() => {
		if (filmId !== null) dialogEl?.showModal();
		else dialogEl?.close();
	});

	function blockDismiss(e: Event) {
		e.preventDefault();
	}
</script>

<dialog
	bind:this={dialogEl}
	oncancel={blockDismiss}
	class="fixed inset-0 m-auto rounded-xs border border-rule bg-paper p-0 text-ink backdrop:bg-black/40"
>
	{#if filmId !== null}
		<div class="w-80 max-w-[90vw] p-5">
			<p class="font-display text-lg leading-snug font-bold uppercase">
				How was<br />{filmTitle}?
			</p>

			<div class="mt-4 flex justify-center">
				<Stars {filmId} rating={null} size="size-7" action="?/confirm" onSaved={onRated} {onError} />
			</div>

			<form method="POST" action="?/confirm" use:enhance={onSkip}>
				<input type="hidden" name="filmId" value={filmId} />
				<button
					type="submit"
					class="mt-5 block rounded-xs border border-rule px-3 py-2 font-mono text-xs tracking-button text-muted uppercase transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3 mx-auto"
				>
					I'm not sure yet
				</button>
			</form>
		</div>
	{/if}
</dialog>
