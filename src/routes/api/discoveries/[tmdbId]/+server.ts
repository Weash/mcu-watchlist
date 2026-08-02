import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { discoveries, films } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slug';
import type { RequestHandler } from './$types';

/**
 * Resolves a discovery: either promote it into the catalogue or dismiss it.
 *
 * `phase` and `saga` must be supplied by the caller because TMDB has no
 * concept of either. That is the judgement this endpoint exists to accept —
 * the mechanical sync deliberately cannot make it.
 *
 * Body: { action: 'add', phase: number, saga: string } | { action: 'ignore' }
 */
export const POST: RequestHandler = async ({ params, request, platform }) => {
	const db = getDb(platform);
	const tmdbId = Number(params.tmdbId);
	if (!Number.isInteger(tmdbId)) throw error(400, 'Bad discovery id');

	const body = (await request.json()) as {
		action?: unknown;
		phase?: unknown;
		saga?: unknown;
	};

	const [discovery] = await db
		.select()
		.from(discoveries)
		.where(eq(discoveries.tmdbId, tmdbId));

	if (!discovery) throw error(404, 'Discovery not found');
	if (discovery.status !== 'pending') {
		throw error(409, `Discovery already ${discovery.status}`);
	}

	if (body.action === 'ignore') {
		await db
			.update(discoveries)
			.set({ status: 'ignored' })
			.where(eq(discoveries.tmdbId, tmdbId));
		return json({ ok: true, action: 'ignored', title: discovery.title });
	}

	if (body.action !== 'add') throw error(400, "action must be 'add' or 'ignore'");

	const phase = Number(body.phase);
	const saga = typeof body.saga === 'string' ? body.saga.trim() : '';
	if (!Number.isInteger(phase) || phase < 1) throw error(400, 'phase is required');
	if (!saga) throw error(400, 'saga is required');
	if (!discovery.releaseDate) {
		throw error(400, `${discovery.title} has no release date on TMDB — it can't be ordered.`);
	}

	// Slug collisions are possible (a remake, a re-release). Suffix rather than
	// fail; the id is internal and never displayed.
	const base = slugify(discovery.title);
	let id = base;
	for (let n = 2; ; n++) {
		const [clash] = await db.select({ id: films.id }).from(films).where(eq(films.id, id));
		if (!clash) break;
		id = `${base}${n}`;
	}

	await db.insert(films).values({
		id,
		tmdbId: discovery.tmdbId,
		mediaType: discovery.mediaType,
		title: discovery.title,
		releaseDate: discovery.releaseDate,
		posterPath: discovery.posterPath,
		description: null,
		descriptionSource: null,
		saga,
		phase
	});

	await db.update(discoveries).set({ status: 'added' }).where(eq(discoveries.tmdbId, tmdbId));

	return json({ ok: true, action: 'added', id, title: discovery.title });
};
