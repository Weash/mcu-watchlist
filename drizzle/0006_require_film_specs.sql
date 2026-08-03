-- Makes the five film-spec columns added in 0004 and backfilled in 0005
-- required. SQLite has no ALTER COLUMN, so this is a table rebuild, same
-- shape as 0003.
--
-- HAND-WRITTEN, not drizzle-kit's scaffold: drizzle-kit's last recorded
-- schema state predates 0004 (a hand-written migration, like 0001, that
-- never went through `db:generate`), so a generated diff here would try to
-- both add the columns and constrain them in one migration — colliding with
-- the columns 0004 already added.
--
-- Unlike 0003, `watches` is not empty at this point — it holds real ticks
-- and ratings — so it cannot simply be dropped and left dropped. It still
-- has to go before `films` is rebuilt (the FK-referenced-table problem 0003
-- describes), but its rows are copied into a plain backup table first and
-- restored once `films` is back.

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
	`poster_url` text NOT NULL,
	`recap` text NOT NULL,
	`duration` integer NOT NULL,
	`director` text NOT NULL,
	`post_credits_scenes` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint

-- Ids are preserved rather than reassigned: 0003 already put them in release
-- order, and nothing here changes that ordering.
INSERT INTO `__new_films` ("id", "media_type", "title", "release_date", "description", "saga", "phase", "poster_url", "recap", "duration", "director", "post_credits_scenes", "updated_at")
SELECT "id", "media_type", "title", "release_date", "description", "saga", "phase", "poster_url", "recap", "duration", "director", "post_credits_scenes", "updated_at"
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
