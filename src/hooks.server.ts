import { error, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { verifyAccessJwt } from '$lib/server/auth';
import type { AuthUser } from '$lib/server/auth';

/**
 * Populates `locals.user` for every request, or refuses to serve.
 *
 * Every request carries a Cloudflare Access JWT, which is verified here rather
 * than trusted. That verification is the security boundary: it is what makes
 * reaching the Worker directly, bypassing the Access gate, useless to an
 * attacker.
 *
 * Cloudflare Access is not in front of `vite dev`, so local development has no
 * JWT. The bypass below is gated on `dev` — a build-time constant that Vite
 * replaces with `false` in the production bundle, so the branch is eliminated
 * and the deployed Worker contains no bypass path at all.
 *
 * Note what this is deliberately *not*: a check for a missing header. Writing
 * `if (!token) useDevUser()` would turn any Access misconfiguration into an
 * authentication bypass in production. The condition must be the build mode,
 * never the request.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const env = event.platform?.env;

	let user: AuthUser | null = null;

	if (dev) {
		user = {
			sub: env?.DEV_USER_SUB ?? 'dev-user',
			email: 'dev@localhost',
			isOwner: true
		};
	} else {
		if (!env) throw error(500, 'Worker environment unavailable');
		user = await verifyAccessJwt(event.request, {
			teamDomain: env.ACCESS_TEAM_DOMAIN,
			aud: env.ACCESS_AUD,
			ownerSub: env.OWNER_SUB
		});
	}

	if (!user) {
		// Access should have caught this before the request arrived. Reaching
		// here means someone hit the Worker directly, so refuse rather than
		// redirect — there is nowhere useful to send them.
		throw error(401, 'Not authenticated');
	}

	event.locals.user = user;
	return resolve(event);
};
