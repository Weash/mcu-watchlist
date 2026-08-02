import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { films, watches } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export interface FilmRow {
	id: number;
	title: string;
	releaseDate: string;
	year: number;
	description: string;
	/** Derived from release_date, never stored — see the schema comment. */
	upcoming: boolean;
	seen: boolean;
}

export interface PhaseGroup {
	phase: number;
	films: FilmRow[];
	releasedCount: number;
	seenCount: number;
}

export interface SagaGroup {
	saga: string;
	phases: PhaseGroup[];
}

/** ISO date for "today" in the viewer's terms. UTC is close enough for a
 * release-date comparison — being a few hours out on a film you haven't seen
 * yet is harmless, and it keeps the SSR render deterministic. */
function today(): string {
	return new Date().toISOString().slice(0, 10);
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	const db = getDb(platform);
	const now = today();

	// One query: every film, with this user's tick attached if there is one.
	const rows = await db
		.select({
			id: films.id,
			title: films.title,
			releaseDate: films.releaseDate,
			description: films.description,
			saga: films.saga,
			phase: films.phase,
			watchedAt: watches.watchedAt
		})
		.from(films)
		.leftJoin(
			watches,
			and(eq(watches.filmId, films.id), eq(watches.userSub, locals.user.sub))
		)
		// release_date is the sort key; it replaces an explicit sort_order and
		// reproduces release order including same-year ties.
		.orderBy(films.releaseDate);

	// Group into saga → phase, preserving release order within each phase.
	const sagas: SagaGroup[] = [];
	for (const row of rows) {
		const film: FilmRow = {
			id: row.id,
			title: row.title,
			releaseDate: row.releaseDate,
			year: Number(row.releaseDate.slice(0, 4)),
			description: row.description,
			upcoming: row.releaseDate > now,
			seen: row.watchedAt !== null
		};

		let saga = sagas.at(-1);
		if (!saga || saga.saga !== row.saga) {
			saga = { saga: row.saga, phases: [] };
			sagas.push(saga);
		}

		let phase = saga.phases.at(-1);
		if (!phase || phase.phase !== row.phase) {
			phase = { phase: row.phase, films: [], releasedCount: 0, seenCount: 0 };
			saga.phases.push(phase);
		}

		phase.films.push(film);
		if (!film.upcoming) {
			phase.releasedCount++;
			if (film.seen) phase.seenCount++;
		}
	}

	const released = rows.filter((r) => r.releaseDate <= now);
	const seenCount = released.filter((r) => r.watchedAt !== null).length;

	return {
		sagas,
		totalFilms: rows.length,
		releasedCount: released.length,
		seenCount,
		isOwner: locals.user.isOwner
	};
};

export const actions: Actions = {
	/**
	 * Sets a film's watched state.
	 *
	 * Takes the *desired* state rather than flipping the current one, so that
	 * rapid double-taps converge on what the user last pressed instead of
	 * racing.
	 */
	toggle: async ({ request, locals, platform }) => {
		const db = getDb(platform);
		const form = await request.formData();
		const filmId = Number(form.get('filmId'));
		const next = form.get('next');

		if (!Number.isInteger(filmId)) {
			return fail(400, { message: 'Missing film' });
		}

		if (next === 'true') {
			await db
				.insert(watches)
				.values({ userSub: locals.user.sub, filmId })
				.onConflictDoNothing();
		} else {
			await db
				.delete(watches)
				.where(and(eq(watches.userSub, locals.user.sub), eq(watches.filmId, filmId)));
		}

		return { ok: true };
	},

	reset: async ({ locals, platform }) => {
		const db = getDb(platform);
		await db.delete(watches).where(eq(watches.userSub, locals.user.sub));
		return { ok: true };
	}
};
