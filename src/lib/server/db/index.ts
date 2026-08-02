import { drizzle } from 'drizzle-orm/d1';
import { error } from '@sveltejs/kit';
import * as schema from './schema';

export type Db = ReturnType<typeof getDb>;

/**
 * Builds a Drizzle client over the request's D1 binding.
 *
 * D1 bindings are per-request on Workers, so this is called per request rather
 * than held in a module-level singleton.
 */
export function getDb(platform: App.Platform | undefined) {
	const d1 = platform?.env?.DB;
	if (!d1) {
		throw error(
			500,
			'D1 binding "DB" unavailable. In dev this usually means wrangler.jsonc ' +
				'has no database_id yet, or migrations have not been applied locally.'
		);
	}
	return drizzle(d1, { schema });
}

export { schema };
