<script lang="ts">
	/**
	 * Opens when a poster thumbnail is clicked, showing the same `posterUrl`
	 * image larger. Only ever invoked for a film with a real poster — the
	 * generic fallback poster isn't clickable, so `posterUrl` here is never
	 * the fallback asset.
	 *
	 * Unlike RatingDialog, this is just a viewer: backdrop click, Escape, and
	 * the close button all dismiss it the normal way.
	 */
	interface Props {
		posterUrl: string | null;
		filmTitle: string;
		onClose: () => void;
	}

	let { posterUrl, filmTitle, onClose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement>();

	$effect(() => {
		if (posterUrl !== null) dialogEl?.showModal();
	});

	function close() {
		dialogEl?.close();
	}

	/** Dismiss on a click that lands on the dialog's own backdrop area. */
	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) close();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={onClose}
	onclick={onBackdropClick}
	class="fixed inset-0 m-auto rounded-lg border-0 bg-transparent p-0 backdrop:bg-ink/40"
>
	{#if posterUrl !== null}
		<img
			src={posterUrl}
			alt="{filmTitle} poster"
			class="block max-h-[90vh] max-w-[90vw] w-auto rounded-lg object-contain"
		/>

		<button
			type="button"
			onclick={close}
			aria-label="Close"
			class="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-paper transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
		>
			<svg
				viewBox="0 0 16 16"
				class="size-4 fill-none stroke-current stroke-[1.75]"
				aria-hidden="true"
			>
				<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke-linecap="round" />
			</svg>
		</button>
	{/if}
</dialog>
