<script lang="ts">
	import { isDarkMode, setDarkMode } from './theme';

	interface Props {
		isOwner: boolean;
		hideSeen: boolean;
		onToggleHideSeen: () => void;
		onReset: () => void;
	}

	let { isOwner, hideSeen, onToggleHideSeen, onReset }: Props = $props();

	let open = $state(false);
	let isDark = $state(false);
	let menuEl = $state<HTMLDivElement>();

	$effect(() => {
		isDark = isDarkMode();
	});

	function closeMenu() {
		open = false;
	}

	function toggleTheme() {
		const next = !isDark;
		setDarkMode(next);
		isDark = next;
		closeMenu();
	}

	function toggleHideSeen() {
		onToggleHideSeen();
		closeMenu();
	}

	function reset() {
		onReset();
		closeMenu();
	}

	function onWindowClick(e: MouseEvent) {
		if (open && menuEl && !menuEl.contains(e.target as Node)) closeMenu();
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') closeMenu();
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="relative" bind:this={menuEl}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-label="Menu"
		aria-expanded={open}
		aria-haspopup="true"
		class="-m-1.5 p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
	>
		<svg viewBox="0 0 16 16" class="size-5 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
			<path d="M2 4.5h12M2 8h12M2 11.5h12" stroke-linecap="round" />
		</svg>
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute top-full right-0 z-10 mt-2 w-56 rounded-xs border border-rule bg-paper py-1 text-ink"
		>
			{#if isOwner}
				<a
					href="/admin"
					role="menuitem"
					onclick={closeMenu}
					class="block px-3 py-2 font-mono text-xs tracking-button text-muted uppercase transition-colors hover:bg-rule/25 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
				>
					Admin
				</a>
			{/if}

			<button
				type="button"
				onclick={toggleTheme}
				role="menuitemcheckbox"
				aria-checked={isDark}
				class="block w-full px-3 py-2 text-left font-mono text-xs tracking-button text-muted uppercase transition-colors hover:bg-rule/25 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
			>
				{isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			</button>

			<button
				type="button"
				onclick={toggleHideSeen}
				role="menuitemcheckbox"
				aria-checked={hideSeen}
				class="block w-full px-3 py-2 text-left font-mono text-xs tracking-button text-muted uppercase transition-colors hover:bg-rule/25 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
			>
				{hideSeen ? 'Showing unseen only' : "Hide what I've seen"}
			</button>

			<button
				type="button"
				onclick={reset}
				role="menuitem"
				class="block w-full px-3 py-2 text-left font-mono text-xs tracking-button text-phase-1 uppercase transition-colors hover:bg-rule/25 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
			>
				Reset
			</button>
		</div>
	{/if}
</div>
