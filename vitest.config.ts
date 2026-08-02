import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Tests run in plain Node, not the workers runtime — see
 * src/lib/server/db/testing.ts for why that trade is worth making.
 *
 * `$lib` is aliased by hand rather than by loading the SvelteKit plugin, which
 * would pull in the whole dev server for a suite that never renders a
 * component.
 */
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
