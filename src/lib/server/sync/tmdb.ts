/**
 * Minimal TMDB client — only the three calls the sync needs.
 *
 * Deliberately dependency-free and alias-free: this module is bundled into the
 * sync Worker by wrangler, which does not resolve SvelteKit's `$lib` alias.
 */

const BASE = 'https://api.themoviedb.org/3';

/** The community-maintained "marvel cinematic universe (mcu)" keyword. */
export const MCU_KEYWORD_ID = 180547;

export interface TmdbMovie {
	id: number;
	title: string;
	/** May be '' on TMDB for unscheduled films — callers must handle that. */
	release_date: string;
	poster_path: string | null;
	overview: string;
}

async function tmdb<T>(path: string, apiKey: string): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: 'application/json'
		}
	});
	if (!res.ok) {
		throw new Error(`TMDB ${path} -> ${res.status} ${res.statusText}`);
	}
	return (await res.json()) as T;
}

/** Current details for one film. Used to refresh title/date/poster. */
export function getMovie(id: number, apiKey: string): Promise<TmdbMovie> {
	return tmdb<TmdbMovie>(`/movie/${id}`, apiKey);
}

/**
 * Every film tagged with the MCU keyword, following pagination.
 *
 * This is the *discovery* surface only. Nothing returned here is inserted
 * automatically — the tag is community-maintained and reliably includes
 * making-of specials, documentaries and outright mistags.
 */
export async function getKeywordMovies(apiKey: string): Promise<TmdbMovie[]> {
	const all: TmdbMovie[] = [];
	let page = 1;
	let totalPages = 1;

	// Bounded so a TMDB change can't spin this forever.
	while (page <= totalPages && page <= 20) {
		const data = await tmdb<{
			page: number;
			total_pages: number;
			results: TmdbMovie[];
		}>(`/keyword/${MCU_KEYWORD_ID}/movies?page=${page}`, apiKey);

		all.push(...data.results);
		totalPages = data.total_pages;
		page++;
	}

	return all;
}

/**
 * Finds a film's TMDB id by title and release year.
 *
 * Only used to backfill the seeded catalogue, which was created from the
 * original design and has no TMDB ids. Returns null rather than guessing when
 * there's no confident match — a wrong id would make the sync silently
 * overwrite a film's title with a different film's.
 */
export async function findMovieId(
	title: string,
	year: number,
	apiKey: string
): Promise<number | null> {
	const data = await tmdb<{ results: TmdbMovie[] }>(
		`/search/movie?query=${encodeURIComponent(title)}&primary_release_year=${year}`,
		apiKey
	);

	if (data.results.length === 0) return null;

	const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
	const wanted = normalise(title);

	const exact = data.results.find((r) => normalise(r.title) === wanted);
	if (exact) return exact.id;

	// A single result for an exact-title-and-year search is safe enough;
	// anything ambiguous is left for a human.
	if (data.results.length === 1) return data.results[0].id;

	return null;
}
