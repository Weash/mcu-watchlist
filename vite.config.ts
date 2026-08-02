import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// platformProxy gives `vite dev` the real Cloudflare bindings from
			// wrangler.jsonc via Miniflare — so D1 works locally against a
			// persisted SQLite file, and .dev.vars values appear on platform.env.
			adapter: adapter({
				platformProxy: {
					configPath: 'wrangler.jsonc',
					persist: { path: '.wrangler/state/v3' }
				}
			})
		})
	]
});
