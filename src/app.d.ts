// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			/**
			 * The authenticated user, derived from the Cloudflare Access JWT.
			 * Always present in a request handler — `hooks.server.ts` rejects
			 * unauthenticated requests before they reach one.
			 */
			user: {
				/** Stable per-user identifier from the JWT `sub` claim. The DB key. */
				sub: string;
				email: string;
				/** True when `sub` matches OWNER_SUB. Gates /admin. */
				isOwner: boolean;
			};
		}

		interface Platform {
			env: {
				DB: D1Database;
				ACCESS_TEAM_DOMAIN: string;
				ACCESS_AUD: string;
				OWNER_SUB: string;
				TMDB_API_KEY: string;
				/**
				 * Bearer token for /api/*, used by the scheduled Claude routine.
				 * Unset closes the API entirely.
				 */
				SYNC_TOKEN?: string;
				/** Local development only — see hooks.server.ts. */
				DEV_USER_SUB?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage;
		}
	}
}

export {};
