import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthUser {
	sub: string;
	email: string;
	isOwner: boolean;
}

/**
 * Cloudflare Access sits in front of this Worker and authenticates the user,
 * but the Worker verifies the token itself rather than trusting that Access
 * is in front of it. That verification is the actual security boundary: it is
 * what makes reaching the Worker directly — bypassing the Access gate —
 * useless to an attacker.
 *
 * Access signs a JWT with a key pair unique to the account and passes it as
 * the `Cf-Access-Jwt-Assertion` header. We check the signature against the
 * team's published JWKS, and check `aud` against this specific application so
 * a token minted for a *different* Access app in the same account is rejected.
 */

/**
 * One JWKS per team domain, cached for the life of the isolate. `jose` handles
 * refresh and rate-limiting internally, so this must not be recreated per
 * request — doing so would refetch the keys on every page load.
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
	let jwks = jwksCache.get(teamDomain);
	if (!jwks) {
		jwks = createRemoteJWKSet(
			new URL(`https://${teamDomain}/cdn-cgi/access/certs`)
		);
		jwksCache.set(teamDomain, jwks);
	}
	return jwks;
}

export interface AccessConfig {
	teamDomain: string;
	aud: string;
	ownerSub: string;
}

/**
 * Verifies the Access JWT on a request. Returns null when there is no token
 * or it fails verification — callers must treat null as unauthenticated and
 * refuse to serve.
 */
export async function verifyAccessJwt(
	request: Request,
	config: AccessConfig
): Promise<AuthUser | null> {
	const token =
		request.headers.get('Cf-Access-Jwt-Assertion') ??
		// Access also sets a cookie; the header is normally present, but the
		// cookie is the fallback for requests that reach the Worker without it.
		readCookie(request.headers.get('Cookie'), 'CF_Authorization');

	if (!token) return null;

	try {
		const { payload } = await jwtVerify(token, getJwks(config.teamDomain), {
			issuer: `https://${config.teamDomain}`,
			audience: config.aud
		});

		const sub = typeof payload.sub === 'string' ? payload.sub : null;
		if (!sub) return null;

		const email = typeof payload.email === 'string' ? payload.email : '';

		return {
			sub,
			email,
			// Access authenticates everyone on the allow list identically, so
			// owner-only surfaces need their own check on top of it.
			isOwner: Boolean(config.ownerSub) && sub === config.ownerSub
		};
	} catch {
		// Expired, wrong audience, bad signature, unreachable JWKS — all mean
		// "not authenticated". Never fall through to a default identity.
		return null;
	}
}

function readCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	for (const part of header.split(';')) {
		const [k, ...v] = part.trim().split('=');
		if (k === name) return v.join('=');
	}
	return null;
}
