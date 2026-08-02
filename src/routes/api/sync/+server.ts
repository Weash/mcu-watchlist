import { json, error } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { films, discoveries } from '$lib/server/db/schema';
import { runSync } from '$lib/server/sync/run';
import type { RequestHandler } from './$types';

/**
 * Runs the mechanical sync, then returns everything the routine needs to do
 * the judgement half in one round trip:
 *
 *   - what changed (release dates in particular)
 *   - which discoveries are awaiting triage
 *   - which films are missing a description
 *   - existing descriptions to match the voice against
 *
 * Authentication is handled in hooks.server.ts (bearer SYNC_TOKEN).
 */
export const POST: RequestHandler = async ({ platform }) => {
	const db = getDb(platform);
	const env = platform?.env;
	if (!env?.TMDB_API_KEY) throw error(500, 'TMDB_API_KEY is not set');

	const report = await runSync({ DB: env.DB, TMDB_API_KEY: env.TMDB_API_KEY });

	const pending = await db
		.select()
		.from(discoveries)
		.where(eq(discoveries.status, 'pending'));

	const needsDescription = await db
		.select({
			id: films.id,
			title: films.title,
			releaseDate: films.releaseDate,
			phase: films.phase,
			saga: films.saga
		})
		.from(films)
		.where(isNull(films.description));

	// The style reference. Sent in full rather than sampled — the whole point
	// of moving descriptions to the routine is that it can see every existing
	// line, not eight of them.
	const styleReference = await db
		.select({ title: films.title, description: films.description })
		.from(films)
		.where(and(eq(films.descriptionSource, 'authored')))
		.orderBy(films.releaseDate);

	return json({ report, pending, needsDescription, styleReference });
};
