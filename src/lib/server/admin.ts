import { error } from '@sveltejs/kit';

/**
 * Owner-only.
 *
 * Cloudflare Access authenticates everyone on the allow list identically, so
 * anyone you add as a friend would otherwise reach these pages. The `isOwner`
 * check (JWT `sub` against the OWNER_SUB secret) is what keeps them yours.
 *
 * Shared by /admin and /admin/[id] — there is no layout `load` doing it once,
 * because a missing guard on a route that mutates the catalogue is not a thing
 * to leave to inheritance.
 */
export function requireOwner(locals: App.Locals) {
	if (!locals.user.isOwner) throw error(403, 'Not authorised');
}
