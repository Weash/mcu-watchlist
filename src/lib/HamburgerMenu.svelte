<script lang="ts">
	import { isDarkMode, setDarkMode } from './theme';

	/**
	 * The watchlist-only rows (Admin link, Hide seen, Reset) are all
	 * optional — the admin pages reuse this same menu for its Appearance
	 * section but have no use for them, so each renders only when its
	 * handler is supplied.
	 */
	interface Props {
		isOwner?: boolean;
		hideSeen?: boolean;
		onToggleHideSeen?: () => void;
		onReset?: () => void;
	}

	let { isOwner = false, hideSeen = false, onToggleHideSeen, onReset }: Props = $props();

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
		onToggleHideSeen?.();
		closeMenu();
	}

	function reset() {
		onReset?.();
		closeMenu();
	}

	function onWindowClick(e: MouseEvent) {
		if (open && menuEl && !menuEl.contains(e.target as Node)) closeMenu();
	}

	function onWindowKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') closeMenu();
	}
</script>

{#snippet itemIcon(path: string)}
	<svg viewBox="0 0 16 16" class="size-[15px] flex-none fill-none stroke-muted stroke-[1.4]" aria-hidden="true">
		<path d={path} stroke-linecap="round" />
	</svg>
{/snippet}

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class="relative" bind:this={menuEl}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-label="Menu"
		aria-expanded={open}
		aria-haspopup="true"
		class="flex size-[30px] flex-none cursor-pointer items-center justify-center rounded-[3px] border border-rule text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
	>
		<svg viewBox="0 0 16 16" class="size-[17px] fill-none stroke-current stroke-[1.5]" aria-hidden="true">
			<path d="M2 4.5h12M2 8h12M2 11.5h12" stroke-linecap="round" />
		</svg>
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute top-full right-0 z-40 mt-2 w-[232px] overflow-hidden rounded-[4px] border border-rule bg-surface text-ink shadow-[0_14px_30px_rgba(0,0,0,0.55)]"
		>
			{#if isOwner}
				<a
					href="/admin"
					role="menuitem"
					onclick={closeMenu}
					class="block px-3 py-2.5 font-mono text-xs tracking-button text-ink uppercase transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
				>
					Admin
				</a>
				<div class="h-px bg-rule"></div>
			{/if}

			{#if onToggleHideSeen}
				<div class="px-3 pt-2.5 pb-1 font-mono text-2xs tracking-label text-muted uppercase">
					View
				</div>

				<button
					type="button"
					onclick={toggleHideSeen}
					role="menuitemcheckbox"
					aria-checked={hideSeen}
					class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
				>
					{@render itemIcon('M8 13.6A5.6 5.6 0 108 2.4a5.6 5.6 0 000 11.2zM3.5 12.5L12.5 3.5')}
					<span class="flex-1 font-mono text-xs tracking-button text-ink uppercase">Hide seen</span>
					<span
						class="relative h-[17px] w-[30px] flex-none rounded-full border border-control-border transition-colors duration-150"
						class:bg-ink={hideSeen}
					>
						<span
							class="absolute top-[2px] size-[11px] rounded-full transition-[left] duration-150 {hideSeen
								? 'left-4 bg-paper'
								: 'left-[3px] bg-muted'}"
						></span>
					</span>
				</button>

				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
				>
					{@render itemIcon('M2.5 4h11M2.5 8h7M2.5 12h4')}
					<span class="flex-1 font-mono text-xs tracking-button text-ink uppercase">Sort</span>
					<span class="font-mono text-2xs text-muted">Release</span>
				</button>

				<div class="h-px bg-rule"></div>
			{/if}

			<div class="px-3 pt-2.5 pb-1 font-mono text-2xs tracking-label text-muted uppercase">
				Appearance
			</div>

			<button
				type="button"
				onclick={toggleTheme}
				role="menuitemcheckbox"
				aria-checked={isDark}
				class="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
			>
				{@render itemIcon('M8 2.4a5.6 5.6 0 000 11.2 5.6 5.6 0 000-11.2z')}
				<span class="flex-1 font-mono text-xs tracking-button text-ink uppercase">
					{isDark ? 'Dark mode' : 'Light mode'}
				</span>
			</button>

			{#if onReset}
				<div class="h-px bg-rule"></div>

				<button
					type="button"
					onclick={reset}
					role="menuitem"
					class="flex w-full px-3 py-2.5 text-left text-phase-1 transition-colors hover:bg-phase-1/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
				>
					<span class="flex-1 font-mono text-xs tracking-button uppercase">Reset everything</span>
				</button>
			{/if}
		</div>
	{/if}
</div>
