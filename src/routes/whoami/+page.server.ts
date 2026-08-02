import type { PageServerLoad } from './$types';

/**
 * Temporary bootstrap route.
 *
 * After the first deploy, visit /whoami to read your Google identity's `sub`
 * claim, then set it as a secret:
 *
 *     npx wrangler secret put OWNER_SUB
 *
 * Delete this route once OWNER_SUB is set. It exposes nothing an authenticated
 * user doesn't already know about themselves, but it has no reason to exist
 * after setup.
 */
export const load: PageServerLoad = async ({ locals }) => {
	return { user: locals.user };
};
