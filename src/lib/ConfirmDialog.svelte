<script lang="ts">
	/**
	 * Generic yes/no confirmation for a destructive action. Unlike
	 * RatingDialog, backdrop click and Escape both cancel — there's nothing
	 * unsaved to protect here, only an action to back out of.
	 */
	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel: string;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { open, title, message, confirmLabel, onConfirm, onCancel }: Props = $props();

	let dialogEl = $state<HTMLDialogElement>();

	$effect(() => {
		if (open) dialogEl?.showModal();
		else dialogEl?.close();
	});

	function cancel() {
		dialogEl?.close();
		onCancel();
	}

	function confirm() {
		dialogEl?.close();
		onConfirm();
	}

	function onCancelEvent(e: Event) {
		e.preventDefault();
		cancel();
	}

	/** Dismiss on a click that lands on the dialog's own backdrop area. */
	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) cancel();
	}
</script>

<dialog
	bind:this={dialogEl}
	oncancel={onCancelEvent}
	onclick={onBackdropClick}
	class="fixed inset-0 m-auto rounded-xs border border-rule bg-paper p-0 text-ink backdrop:bg-black/40"
>
	{#if open}
		<div class="w-80 max-w-[90vw] p-5">
			<p class="font-display text-lg leading-snug font-bold uppercase">{title}</p>
			<p class="mt-2 text-sm leading-snug text-body">{message}</p>

			<div class="mt-5 flex justify-center gap-2">
				<button
					type="button"
					onclick={cancel}
					class="rounded-xs border border-rule px-3 py-2 font-mono text-xs tracking-button text-muted uppercase transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirm}
					class="rounded-xs border border-phase-1 px-3 py-2 font-mono text-xs tracking-button text-phase-1 uppercase transition-colors hover:bg-phase-1 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	{/if}
</dialog>
