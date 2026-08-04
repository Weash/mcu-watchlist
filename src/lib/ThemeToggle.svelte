<script lang="ts">
	/**
	 * Follows system preference until the first click, which pins an explicit
	 * choice to `<html class="dark|light">` and localStorage — from then on
	 * localStorage leads, overriding the system preference. See app.html for
	 * the blocking script that applies the stored class before first paint,
	 * and app.css for the dark palette itself.
	 */
	let isDark = $state(false);

	$effect(() => {
		const root = document.documentElement;
		isDark = root.classList.contains('dark')
			? true
			: root.classList.contains('light')
				? false
				: window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggle() {
		const next = !isDark;
		const root = document.documentElement;
		root.classList.remove('dark', 'light');
		root.classList.add(next ? 'dark' : 'light');
		localStorage.setItem('theme', next ? 'dark' : 'light');
		isDark = next;
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
	aria-pressed={isDark}
	class="-m-1.5 p-1.5 text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
>
	{#if isDark}
		<svg viewBox="0 0 16 16" class="size-5 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
			<path
				d="M13.5 9.3A5.5 5.5 0 016.7 2.5a5.5 5.5 0 106.8 6.8z"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 16 16" class="size-5 fill-none stroke-current stroke-[1.5]" aria-hidden="true">
			<circle cx="8" cy="8" r="3.25" />
			<path
				d="M8 1.5v1.6M8 12.9v1.6M14.5 8h-1.6M3.1 8H1.5M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1M12.6 12.6l-1.1-1.1M4.5 4.5L3.4 3.4"
				stroke-linecap="round"
			/>
		</svg>
	{/if}
</button>
