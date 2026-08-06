import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { requireOwner } from '$lib/server/admin';
import { createFilm, currentPhase, parseFilmForm, sagaByPhase } from '$lib/server/films';
import type { Actions, PageServerLoad } from './$types';

/**
 * Static, so it wins over `/admin/[id]` — `new` is never a film id.
 */
export const load: PageServerLoad = async ({ locals, platform }) => {
	requireOwner(locals);
	const db = getDb(platform);

	const [current, sagas] = await Promise.all([currentPhase(db), sagaByPhase(db)]);

	return {
		sagaByPhase: sagas,
		// What the form starts on. Null only when the catalogue is empty, which
		// the form handles by falling back to phase 1.
		current
	};
};

export const actions: Actions = {
	/**
	 * Redirects rather than returning, because this page exists to add one
	 * film and the catalogue is where you go to see it landed. The title rides
	 * along in the query string, the same way a delete carries its own.
	 */
	create: async ({ request, locals, platform }) => {
		requireOwner(locals);
		const db = getDb(platform);

		const parsed = parseFilmForm(await request.formData());
		if (!parsed.ok) return fail(400, { message: parsed.message });

		const film = await createFilm(db, parsed.value);
		redirect(303, `/admin?added=${encodeURIComponent(film.title)}`);
	}
};
