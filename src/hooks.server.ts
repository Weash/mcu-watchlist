import { error, type Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { verifyAccessJwt } from '$lib/server/auth';
import type { AuthUser } from '$lib/server/auth';

/**
 * Identity used by the scheduled Claude routine when it calls /api/*.
 *
 * It is a distinct principal from any human so that anything owner-gated can
 * tell "the routine did this" from "you did this".
 */
export const ROUTINE_SUB = '__routine__';

/** Length-independent comparison, so a bad token can't be narrowed by timing. */
function tokensMatch(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * Populates `locals.user` for every request, or refuses to serve.
 *
 * There are two ways in:
 *
 *   /api/*  — bearer token (SYNC_TOKEN). The scheduled routine has no browser
 *             and therefore no Access JWT. If SYNC_TOKEN is unset the whole
 *             API surface is closed rather than open.
 *
 *   everything else — a Cloudflare Access JWT, verified here rather than
 *             trusted. That verification is the security boundary: it is what
 *             makes reaching the Worker directly, bypassing the Access gate,
 *             useless to an attacker.
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

	if (event.url.pathname.startsWith('/api/')) {
		const expected = env?.SYNC_TOKEN;
		if (!expected) throw error(404, 'API disabled');

		const header = event.request.headers.get('Authorization') ?? '';
		const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
		if (!tokensMatch(provided, expected)) throw error(401, 'Not authenticated');

		event.locals.user = { sub: ROUTINE_SUB, email: 'routine', isOwner: true };
		return resolve(event);
	}

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
