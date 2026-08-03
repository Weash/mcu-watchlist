/**
 * Every read and write of the catalogue.
 *
 * Kept out of the form actions so it can be tested against a real database
 * without a request, a platform binding or a worker runtime. The actions above
 * it do three things and nothing else: parse, `fail()` on a bad parse,
 * delegate.
 *
 * Every function takes `db` first. Nothing here reaches for a global.
 */
import { desc, eq, sql } from 'drizzle-orm';
import type { Db } from './db';
import { films } from './db/schema';
import type { Film } from './db/schema';

/** The fields a person supplies. `media_type` is not one of them. */
export interface FilmInput {
	title: string;
	releaseDate: string;
	description: string;
	saga: string;
	phase: number;
	posterUrl: string;
	recap: string;
	duration: number;
	director: string;
	postCreditsScenes: number;
}

export type ParseResult =
	| { ok: true; value: FilmInput }
	| { ok: false; message: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a submitted form.
 *
 * Pure: no database, no request, no clock. Everything it rejects is something
 * `<input required>` also rejects in the browser — this is the copy that runs
 * when the browser's didn't, which is any POST that did not come from the form.
 */
export function parseFilmForm(form: FormData): ParseResult {
	const title = String(form.get('title') ?? '').trim();
	const releaseDate = String(form.get('releaseDate') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const saga = String(form.get('saga') ?? '').trim();
	const phase = Number(form.get('phase'));
	const posterUrl = String(form.get('posterUrl') ?? '').trim();
	const recap = String(form.get('recap') ?? '').trim();
	const duration = Number(form.get('duration'));
	const director = String(form.get('director') ?? '').trim();
	const postCreditsScenes = Number(form.get('postCreditsScenes'));

	if (!title) return { ok: false, message: 'Title is required.' };
	if (!releaseDate) return { ok: false, message: 'Release date is required.' };

	if (!ISO_DATE.test(releaseDate)) {
		return { ok: false, message: 'Release date must be YYYY-MM-DD.' };
	}

	// The regex accepts 2026-02-31. Round-tripping through Date catches it,
	// because release_date is the sort key and a date that does not exist
	// sorts into a position no one can reason about.
	if (new Date(`${releaseDate}T00:00:00Z`).toISOString().slice(0, 10) !== releaseDate) {
		return { ok: false, message: `There is no such date as ${releaseDate}.` };
	}

	if (!description) return { ok: false, message: 'Description is required.' };
	if (!saga) return { ok: false, message: 'Saga is required.' };

	if (!Number.isInteger(phase) || phase < 1) {
		return { ok: false, message: 'Phase must be a whole number of 1 or more.' };
	}

	if (!posterUrl) return { ok: false, message: 'Poster URL is required.' };
	if (!recap) return { ok: false, message: 'Recap is required.' };
	if (!director) return { ok: false, message: 'Director is required.' };

	if (!Number.isInteger(duration) || duration < 1) {
		return { ok: false, message: 'Duration must be a whole number of minutes, 1 or more.' };
	}

	if (!Number.isInteger(postCreditsScenes) || postCreditsScenes < 0) {
		return {
			ok: false,
			message: 'Post-credits scenes must be a whole number of 0 or more.'
		};
	}

	return {
		ok: true,
		value: {
			title,
			releaseDate,
			description,
			saga,
			phase,
			posterUrl,
			recap,
			duration,
			director,
			postCreditsScenes
		}
	};
}

/** The catalogue in release order — the same order the watchlist renders. */
export function listFilms(db: Db): Promise<Film[]> {
	return db.select().from(films).orderBy(films.releaseDate);
}

export async function getFilm(db: Db, id: number): Promise<Film | undefined> {
	const [film] = await db.select().from(films).where(eq(films.id, id));
	return film;
}

/**
 * The phase new films default to, and the saga it belongs to.
 *
 * A new film is essentially always in the current phase or in a brand new one;
 * nothing is ever added to a phase that closed years ago. Reading the highest
 * existing phase makes the common case a form you do not have to touch.
 *
 * Saga comes from the same row rather than being asked for separately, because
 * no phase has ever spanned two sagas. That keeps a typo — `The Multiverse
 * Saga ` with a trailing space — from silently splitting the watchlist into two
 * identically titled sections.
 *
 * Returns null only when the catalogue is empty, which happens in tests.
 */
export async function currentPhase(db: Db): Promise<{ phase: number; saga: string } | null> {
	const [row] = await db
		.select({ phase: films.phase, saga: films.saga })
		.from(films)
		.orderBy(desc(films.phase))
		.limit(1);

	return row ?? null;
}

export async function createFilm(db: Db, input: FilmInput): Promise<Film> {
	const [film] = await db
		.insert(films)
		.values({ ...input, updatedAt: new Date().toISOString() })
		.returning();

	return film;
}

/** Returns the updated row, or undefined if that id is gone. */
export async function updateFilm(
	db: Db,
	id: number,
	input: FilmInput
): Promise<Film | undefined> {
	const [film] = await db
		.update(films)
		.set({ ...input, updatedAt: new Date().toISOString() })
		.where(eq(films.id, id))
		.returning();

	return film;
}

/**
 * Returns the deleted row, or undefined if that id is gone.
 *
 * The caller needs the title for the confirmation message, and after the row
 * is gone there is nowhere left to read it from.
 *
 * `watches` cascades, so this takes the tick with it.
 */
export async function deleteFilm(db: Db, id: number): Promise<Film | undefined> {
	const [film] = await db.delete(films).where(eq(films.id, id)).returning();
	return film;
}

/**
 * Which saga each existing phase belongs to.
 *
 * Feeds the Add and Edit forms, where picking a phase fills in the saga. Built
 * from the highest-numbered film in each phase, so if a phase ever did span
 * two sagas the later one wins — a tie-break that will not come up, since
 * none ever has.
 */
export async function sagaByPhase(db: Db): Promise<Record<number, string>> {
	const rows = await db
		.select({ phase: films.phase, saga: films.saga })
		.from(films)
		.orderBy(films.phase);

	return Object.fromEntries(rows.map((r) => [r.phase, r.saga]));
}

export async function countFilms(db: Db): Promise<number> {
	const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(films);
	return Number(total);
}
