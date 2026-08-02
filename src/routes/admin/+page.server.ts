import { fail } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { requireOwner } from '$lib/server/admin';
import {
	createFilm,
	currentPhase,
	listFilms,
	parseFilmForm,
	sagaByPhase
} from '$lib/server/films';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	requireOwner(locals);
	const db = getDb(platform);

	const [catalogue, current, sagas] = await Promise.all([
		listFilms(db),
		currentPhase(db),
		sagaByPhase(db)
	]);

	return {
		films: catalogue,
		sagaByPhase: sagas,
		// What the Add form starts on. Null only when the catalogue is empty,
		// which the form handles by falling back to phase 1.
		current,
		// Set by the delete redirect. A form action cannot return data through
		// a 303, and a query param beats a cookie for one string shown once.
		deleted: url.searchParams.get('deleted')
	};
};

export const actions: Actions = {
	create: async ({ request, locals, platform }) => {
		requireOwner(locals);
		const db = getDb(platform);

		const parsed = parseFilmForm(await request.formData());
		if (!parsed.ok) return fail(400, { message: parsed.message });

		const film = await createFilm(db, parsed.value);
		return { ok: true, message: `Added ${film.title}.` };
	}
};
