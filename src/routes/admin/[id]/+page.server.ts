import { error, fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { requireOwner } from '$lib/server/admin';
import { deleteFilm, getFilm, parseFilmForm, sagaByPhase, updateFilm } from '$lib/server/films';
import type { Actions, PageServerLoad } from './$types';

/** 404 rather than 500 for /admin/banana. */
function filmId(param: string): number {
	const id = Number(param);
	if (!Number.isInteger(id) || id < 1) throw error(404, 'No such film');
	return id;
}

export const load: PageServerLoad = async ({ params, locals, platform }) => {
	requireOwner(locals);
	const db = getDb(platform);

	const [film, sagas] = await Promise.all([getFilm(db, filmId(params.id)), sagaByPhase(db)]);
	if (!film) throw error(404, 'No such film');

	return { film, sagaByPhase: sagas };
};

export const actions: Actions = {
	/**
	 * The load-bearing one.
	 *
	 * Nothing refreshes release dates any more, so editing one by hand is the
	 * only thing keeping the watchlist correct when Marvel moves a film.
	 */
	update: async ({ params, request, locals, platform }) => {
		requireOwner(locals);
		const db = getDb(platform);

		const parsed = parseFilmForm(await request.formData());
		if (!parsed.ok) return fail(400, { message: parsed.message });

		const film = await updateFilm(db, filmId(params.id), parsed.value);
		if (!film) throw error(404, 'No such film');

		return { ok: true, message: `Saved ${film.title}.` };
	},

	/**
	 * Redirects rather than returning, because the page it was posted from no
	 * longer describes anything. The title rides along in the query string:
	 * an action cannot return data through a 303, and this beats a cookie for
	 * one string shown once.
	 */
	delete: async ({ params, locals, platform }) => {
		requireOwner(locals);
		const db = getDb(platform);

		const film = await deleteFilm(db, filmId(params.id));
		if (!film) throw error(404, 'No such film');

		redirect(303, `/admin?deleted=${encodeURIComponent(film.title)}`);
	}
};
