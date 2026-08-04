/**
 * Shared dark-mode helpers. `<html class="dark|light">` and localStorage are
 * the source of truth — see app.html for the blocking script that applies
 * the stored class before first paint, and app.css for the dark palette.
 */

export function isDarkMode(): boolean {
	const root = document.documentElement;
	return root.classList.contains('dark')
		? true
		: root.classList.contains('light')
			? false
			: window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function setDarkMode(isDark: boolean) {
	const root = document.documentElement;
	root.classList.remove('dark', 'light');
	root.classList.add(isDark ? 'dark' : 'light');
	localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
