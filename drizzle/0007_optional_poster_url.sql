-- Makes `poster_url` optional: a film without a real poster now falls back
-- to a generic placeholder in the UI instead of being blocked on finding one.
--
-- SQLite has no ALTER COLUMN, so this is a table rebuild, same shape as 0006.
--
-- HAND-WRITTEN, not drizzle-kit's scaffold — see 0006's note: drizzle-kit's
-- recorded schema state still predates 0004, so a generated diff here would
-- redo work 0004-0006 already did instead of just relaxing this one column.
--
-- Film 40 (Avengers: Secret Wars) had the Marvel Studios logo stored as its
-- poster_url as a stand-in — that was never a real poster, so its value is
-- cleared to NULL here rather than carried over. The logo now lives as a
-- static fallback asset in the app instead of film data.

CREATE TABLE `__watches_backup` AS SELECT * FROM `watches`;--> statement-breakpoint
DROP TABLE `watches`;--> statement-breakpoint

CREATE TABLE `__new_films` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_type` text DEFAULT 'movie' NOT NULL,
	`title` text NOT NULL,
	`release_date` text NOT NULL,
	`description` text NOT NULL,
	`saga` text NOT NULL,
	`phase` integer NOT NULL,
	`poster_url` text,
	`recap` text NOT NULL,
	`duration` integer NOT NULL,
	`director` text NOT NULL,
	`post_credits_scenes` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint

INSERT INTO `__new_films` ("id", "media_type", "title", "release_date", "description", "saga", "phase", "poster_url", "recap", "duration", "director", "post_credits_scenes", "updated_at")
SELECT "id", "media_type", "title", "release_date", "description", "saga", "phase",
	CASE WHEN "id" = 40 THEN NULL ELSE "poster_url" END,
	"recap", "duration", "director", "post_credits_scenes", "updated_at"
FROM `films`;
--> statement-breakpoint

DROP TABLE `films`;--> statement-breakpoint
ALTER TABLE `__new_films` RENAME TO `films`;--> statement-breakpoint
CREATE INDEX `films_release_date_idx` ON `films` (`release_date`);--> statement-breakpoint

CREATE TABLE `watches` (
	`user_sub` text NOT NULL,
	`film_id` integer NOT NULL,
	`watched_at` text NOT NULL,
	`rating` integer,
	PRIMARY KEY(`user_sub`, `film_id`),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

INSERT INTO `watches` ("user_sub", "film_id", "watched_at", "rating")
SELECT "user_sub", "film_id", "watched_at", "rating" FROM `__watches_backup`;
--> statement-breakpoint

DROP TABLE `__watches_backup`;--> statement-breakpoint
CREATE INDEX `watches_user_idx` ON `watches` (`user_sub`);
