import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

/**
 * Films. Hand-managed through /admin — nothing writes here but you.
 */
export const films = sqliteTable(
	'films',
	{
		/**
		 * Surrogate key. Never displayed except in the /admin/[id] URL, which
		 * you reach by clicking a row, so it carries no meaning and needs none.
		 */
		id: integer('id').primaryKey({ autoIncrement: true }),

		/**
		 * Always 'movie' today, and not on any form. Present so adding TV later
		 * is a migration rather than a rewrite.
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
		 *
		 * Editing this by hand is the only thing keeping the page correct now
		 * that nothing refreshes it: Marvel moves dates, and a stale one makes
		 * a film silently stop rendering as upcoming.
		 */
		releaseDate: text('release_date').notNull(),

		/** One line, in the voice of the page. Required — see the Add form. */
		description: text('description').notNull(),

		/**
		 * Saga is really a property of the phase — no phase has ever spanned
		 * two — but it is stored per film rather than normalised into a
		 * `phases` table, which would be a table, a migration and an admin
		 * surface for something that changes once every three years. The Add
		 * form defends the invariant by deriving both from the current phase.
		 */
		saga: text('saga').notNull(),

		/** 1..N. Colours for 1-6 are design tokens in app.css, not stored. */
		phase: integer('phase').notNull(),

		/** When you last edited this row. */
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
		filmId: integer('film_id')
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

export type Film = typeof films.$inferSelect;
export type NewFilm = typeof films.$inferInsert;
