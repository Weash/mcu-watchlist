import { getDb } from '$lib/server/db';
import { requireOwner } from '$lib/server/admin';
import { listFilms } from '$lib/server/films';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	requireOwner(locals);
	const db = getDb(platform);

	return {
		films: await listFilms(db),
		// Set by the add and delete redirects. A form action cannot return data
		// through a 303, and a query param beats a cookie for one string shown
		// once.
		added: url.searchParams.get('added'),
		deleted: url.searchParams.get('deleted')
	};
};
