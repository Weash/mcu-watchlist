import { error } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { films } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

/**
 * Owner-only.
 *
 * Cloudflare Access authenticates everyone on the allow list identically, so
 * anyone you add as a friend would otherwise reach this page. The `isOwner`
 * check (JWT `sub` against the OWNER_SUB secret) is what keeps it yours.
 */
function requireOwner(locals: App.Locals) {
	if (!locals.user.isOwner) throw error(403, 'Not authorised');
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireOwner(locals);
	const db = getDb(platform);

	const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(films);

	return { totalFilms: Number(total) };
};
