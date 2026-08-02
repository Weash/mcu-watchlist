import { drizzle } from 'drizzle-orm/d1';
import { eq, isNotNull, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { films, discoveries, syncState } from '../db/schema';
import { getKeywordMovies, getMovie, findMovieId } from './tmdb';

export interface SyncEnv {
	DB: D1Database;
	TMDB_API_KEY: string;
}

export interface SyncReport {
	backfilledIds: number;
	refreshed: number;
	/** Release dates that moved — the main reason this job exists. */
	dateChanges: Array<{ title: string; from: string; to: string }>;
	newDiscoveries: number;
	errors: string[];
}

/**
 * The mechanical half of the sync: everything that is a fact lookup rather
 * than a judgement call.
 *
 * Deliberately narrow. It refreshes only the fields TMDB owns — title,
 * release_date, poster_path — and records unrecognised keyword-tagged films
 * for review. It never inserts a film, never sets `phase` or `saga`, and never
 * writes a description. Those are judgement calls, handled by the scheduled
 * Claude routine through the /api endpoints.
 */
export async function runSync(env: SyncEnv): Promise<SyncReport> {
	const db = drizzle(env.DB as never);
	const report: SyncReport = {
		backfilledIds: 0,
		refreshed: 0,
		dateChanges: [],
		newDiscoveries: 0,
		errors: []
	};

	// --- 1. Backfill TMDB ids -------------------------------------------------
	// The seeded catalogue came from the original design and has no TMDB ids.
	// Nothing else here can act on a film until it has one.
	const missingIds = await db
		.select({ id: films.id, title: films.title, releaseDate: films.releaseDate })
		.from(films)
		.where(isNull(films.tmdbId));

	for (const film of missingIds) {
		try {
			const year = Number(film.releaseDate.slice(0, 4));
			const tmdbId = await findMovieId(film.title, year, env.TMDB_API_KEY);
			if (tmdbId === null) {
				report.errors.push(`No confident TMDB match for "${film.title}" (${year})`);
				continue;
			}
			await db.update(films).set({ tmdbId }).where(eq(films.id, film.id));
			report.backfilledIds++;
		} catch (e) {
			report.errors.push(`Backfill "${film.title}": ${(e as Error).message}`);
		}
	}

	// --- 2. Refresh the fields TMDB owns -------------------------------------
	const tracked = await db
		.select({
			id: films.id,
			tmdbId: films.tmdbId,
			title: films.title,
			releaseDate: films.releaseDate
		})
		.from(films)
		.where(isNotNull(films.tmdbId));

	for (const film of tracked) {
		try {
			const movie = await getMovie(film.tmdbId!, env.TMDB_API_KEY);

			// TMDB returns '' for films with no scheduled date. Keeping the
			// existing date beats blanking a NOT NULL column.
			const releaseDate = movie.release_date || film.releaseDate;

			if (releaseDate !== film.releaseDate) {
				report.dateChanges.push({ title: film.title, from: film.releaseDate, to: releaseDate });
			}

			await db
				.update(films)
				.set({
					title: movie.title,
					releaseDate,
					posterPath: movie.poster_path,
					updatedAt: new Date().toISOString()
				})
				.where(eq(films.id, film.id));

			report.refreshed++;
		} catch (e) {
			report.errors.push(`Refresh "${film.title}": ${(e as Error).message}`);
		}
	}

	// --- 3. Record discoveries ------------------------------------------------
	// Anything under the MCU keyword that isn't already known. Never inserted
	// as a film: the keyword is community-maintained and picks up making-of
	// specials, documentaries and mistags.
	try {
		const tagged = await getKeywordMovies(env.TMDB_API_KEY);

		const knownFilmIds = new Set(
			(await db.select({ tmdbId: films.tmdbId }).from(films).where(isNotNull(films.tmdbId))).map(
				(r) => r.tmdbId!
			)
		);
		const knownDiscoveries = new Set(
			(await db.select({ tmdbId: discoveries.tmdbId }).from(discoveries)).map((r) => r.tmdbId)
		);

		for (const movie of tagged) {
			if (knownFilmIds.has(movie.id) || knownDiscoveries.has(movie.id)) continue;

			await db
				.insert(discoveries)
				.values({
					tmdbId: movie.id,
					title: movie.title,
					mediaType: 'movie',
					releaseDate: movie.release_date || null,
					posterPath: movie.poster_path,
					overview: movie.overview
				})
				.onConflictDoNothing();

			report.newDiscoveries++;
		}
	} catch (e) {
		report.errors.push(`Discovery: ${(e as Error).message}`);
	}

	// --- 4. Record that we ran ------------------------------------------------
	// Makes a silently-stopped scheduler visible in /admin.
	await db
		.insert(syncState)
		.values({ id: 1, lastRunAt: new Date().toISOString(), lastReport: JSON.stringify(report) })
		.onConflictDoUpdate({
			target: syncState.id,
			set: { lastRunAt: new Date().toISOString(), lastReport: JSON.stringify(report) }
		});

	return report;
}
