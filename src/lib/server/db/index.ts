import { drizzle } from 'drizzle-orm/d1';
import { error } from '@sveltejs/kit';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from './schema';

/**
 * A Drizzle client, whichever driver is underneath.
 *
 * Deliberately not `ReturnType<typeof getDb>`: that would pin it to the D1
 * driver, and the tests run the same query code against node:sqlite. Both are
 * async SQLite, so the structural type covers them and neither leaks into the
 * other's build.
 */
export type Db = BaseSQLiteDatabase<'async', unknown, typeof schema>;

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
