import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

/**
 * Films.
 *
 * Ownership is split deliberately:
 *   - TMDB owns   title, release_date, poster_path, runtime
 *   - You own     saga, phase, description
 *
 * The weekly sync writes only the first group. `saga` and `phase` are
 * editorial — TMDB has no concept of MCU phases — and `description` is
 * generated once and then left alone. See src/lib/server/sync.ts.
 */
export const films = sqliteTable(
	'films',
	{
		/** Stable slug, e.g. "ironman". Referenced by watches, so never rewritten. */
		id: text('id').primaryKey(),

		/** TMDB's id. Null until backfilled; the sync matches on this. */
		tmdbId: integer('tmdb_id').unique(),

		/**
		 * Always 'movie' today. Present so adding TV later is a migration
		 * rather than a rewrite.
		 */
		mediaType: text('media_type', { enum: ['movie', 'tv'] })
			.notNull()
			.default('movie'),

		title: text('title').notNull(),

		/**
		 * US theatrical release, ISO 'YYYY-MM-DD'. SQLite has no date type;
		 * ISO strings sort and compare correctly as text, which is what makes
		 * `release_date > date('now')` work for the upcoming check.
		 *
		 * This is also the sort key — it replaces an explicit sort_order,
		 * since release dates are unique per film.
		 */
		releaseDate: text('release_date').notNull(),

		/** One-line summary. Null means the sync should generate one. */
		description: text('description'),

		/**
		 * Where the description came from. Lets you see at a glance which rows
		 * still have machine-written copy.
		 */
		descriptionSource: text('description_source', {
			enum: ['authored', 'generated', 'tmdb']
		}),

		saga: text('saga').notNull(),
		phase: integer('phase').notNull(),

		/** TMDB poster path fragment, e.g. "/abc123.jpg". Not rendered yet. */
		posterPath: text('poster_path'),

		updatedAt: text('updated_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString())
	},
	(t) => [index('films_release_date_idx').on(t.releaseDate)]
);

/**
 * A tick. One row per (user, film) that the user has seen.
 *
 * Keyed on the Access JWT `sub` claim rather than email, because `sub` is
 * stable across an email change.
 */
export const watches = sqliteTable(
	'watches',
	{
		userSub: text('user_sub').notNull(),
		filmId: text('film_id')
			.notNull()
			.references(() => films.id, { onDelete: 'cascade' }),
		watchedAt: text('watched_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString())
	},
	(t) => [
		primaryKey({ columns: [t.userSub, t.filmId] }),
		index('watches_user_idx').on(t.userSub)
	]
);

/**
 * Films the weekly sync saw under TMDB keyword 180547 that aren't in `films`.
 *
 * Nothing here is ever auto-inserted — keyword 180547 is community-maintained
 * and includes specials, documentaries and mistags. These surface in /admin
 * for you to add (supplying phase + saga) or ignore.
 */
export const discoveries = sqliteTable('discoveries', {
	tmdbId: integer('tmdb_id').primaryKey(),
	title: text('title').notNull(),
	mediaType: text('media_type', { enum: ['movie', 'tv'] })
		.notNull()
		.default('movie'),
	releaseDate: text('release_date'),
	posterPath: text('poster_path'),
	overview: text('overview'),
	firstSeenAt: text('first_seen_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	/** 'pending' shows in /admin; the others are resolved and stay as a record. */
	status: text('status', { enum: ['pending', 'ignored', 'added'] })
		.notNull()
		.default('pending')
});

/**
 * Single-row record of the last sync.
 *
 * The sync runs outside this app (a scheduled Claude routine calling
 * /api/sync), so if it stops running nothing breaks visibly — release dates
 * just quietly go stale. This row is what makes that failure visible: /admin
 * shows how long ago the last successful run was.
 */
export const syncState = sqliteTable('sync_state', {
	id: integer('id').primaryKey(),
	lastRunAt: text('last_run_at').notNull(),
	/** The SyncReport as JSON, for a glance at what the last run did. */
	lastReport: text('last_report').notNull()
});

export type Film = typeof films.$inferSelect;
export type Discovery = typeof discoveries.$inferSelect;
