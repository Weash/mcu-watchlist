<script lang="ts">
	import Stars from './Stars.svelte';

	/**
	 * Opens right after a film is ticked seen. The only ways out are a star
	 * click or "I'm not sure yet" — no backdrop click, no Escape — so a tick
	 * always ends with an explicit choice about the rating, not an accidental
	 * dismissal that leaves the viewer unsure whether it saved.
	 */
	interface Props {
		filmId: number | null;
		filmTitle: string;
		onClose: () => void;
	}

	let { filmId, filmTitle, onClose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement>();

	$effect(() => {
		if (filmId !== null) dialogEl?.showModal();
	});

	function close() {
		dialogEl?.close();
		onClose();
	}

	function blockDismiss(e: Event) {
		e.preventDefault();
	}
</script>

<dialog
	bind:this={dialogEl}
	oncancel={blockDismiss}
	class="rounded-xs border border-rule bg-paper p-0 text-ink backdrop:bg-ink/40"
>
	{#if filmId !== null}
		<div class="w-80 max-w-[90vw] p-5">
			<p class="font-display text-lg leading-snug font-bold uppercase">
				How was<br />{filmTitle}?
			</p>

			<div class="mt-4">
				<Stars {filmId} rating={null} onSaved={close} />
			</div>

			<button
				type="button"
				onclick={close}
				class="mt-5 rounded-xs border border-rule px-3 py-2 font-mono text-xs tracking-button text-muted uppercase transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			>
				I'm not sure yet
			</button>
		</div>
	{/if}
</dialog>
