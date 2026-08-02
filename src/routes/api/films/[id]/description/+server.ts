import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { films } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/**
 * Sets a film's description.
 *
 * Refuses to overwrite an existing one. This is the Q8 rule enforced in code
 * rather than left to the caller's discretion: descriptions are written once
 * and then left alone, because regenerating them makes the page churn for no
 * reason. To deliberately redo one, clear it first with DELETE.
 */
export const PUT: RequestHandler = async ({ params, request, platform }) => {
	const db = getDb(platform);
	const body = (await request.json()) as { description?: unknown };

	const description = typeof body.description === 'string' ? body.description.trim() : '';
	if (!description) throw error(400, 'description is required');
	if (description.length > 300) throw error(400, 'description is too long (max 300 chars)');

	const [film] = await db
		.select({ id: films.id, description: films.description })
		.from(films)
		.where(eq(films.id, params.id));

	if (!film) throw error(404, 'Film not found');
	if (film.description) {
		throw error(409, 'Film already has a description. DELETE it first to replace it.');
	}

	await db
		.update(films)
		.set({ description, descriptionSource: 'generated' })
		.where(eq(films.id, params.id));

	return json({ ok: true, id: params.id, description });
};

/** Clears a description so the next sync writes a fresh one. */
export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = getDb(platform);
	await db
		.update(films)
		.set({ description: null, descriptionSource: null })
		.where(eq(films.id, params.id));
	return json({ ok: true, id: params.id });
};
