-- Manual film management.
--
-- Drops the sync's tables, drops the columns only the sync ever wrote, makes
-- `description` required, and replaces the text slug primary key with an
-- integer.
--
-- HAND-EDITED. drizzle-kit generated this and got three things wrong:
--
--   1. It copied the old text ids straight into an INTEGER PRIMARY KEY, which
--      SQLite rejects outright. The ids are reassigned below instead.
--   2. It guarded the rebuild with `PRAGMA foreign_keys=OFF`, which D1 does
--      not honour inside a migration. Dropping `watches` first removes the
--      need for any pragma: with the child table already gone, DROP TABLE
--      films has no cascade to fire.
--   3. It re-enabled foreign keys partway through, between the films rebuild
--      and the watches rebuild, while `watches.film_id` still held slugs that
--      no longer matched anything.

DROP TABLE `discoveries`;--> statement-breakpoint
DROP TABLE `sync_state`;--> statement-breakpoint

-- Dropped before `films`, not after, so the rebuild below has no child table
-- and therefore no ON DELETE CASCADE to trigger. Nothing is lost: film_id held
-- text slugs that the new `films` no longer has, and on a replay from empty
-- this table has never been written to at this point.
DROP TABLE `watches`;--> statement-breakpoint

CREATE TABLE `__new_films` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_type` text DEFAULT 'movie' NOT NULL,
	`title` text NOT NULL,
	`release_date` text NOT NULL,
	`description` text NOT NULL,
	`saga` text NOT NULL,
	`phase` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint

-- NULL id lets AUTOINCREMENT assign; ordering by release_date means the new
-- ids run in release order.
--
-- No COALESCE on description: it was nullable and is not any more, so a null
-- here should fail the migration loudly rather than be papered over with an
-- empty string. Every seeded row has one.
INSERT INTO `__new_films` ("id", "media_type", "title", "release_date", "description", "saga", "phase", "updated_at")
SELECT NULL, "media_type", "title", "release_date", "description", "saga", "phase", "updated_at"
FROM `films`
ORDER BY "release_date";
--> statement-breakpoint

DROP TABLE `films`;--> statement-breakpoint
ALTER TABLE `__new_films` RENAME TO `films`;--> statement-breakpoint
CREATE INDEX `films_release_date_idx` ON `films` (`release_date`);--> statement-breakpoint

CREATE TABLE `watches` (
	`user_sub` text NOT NULL,
	`film_id` integer NOT NULL,
	`watched_at` text NOT NULL,
	PRIMARY KEY(`user_sub`, `film_id`),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `watches_user_idx` ON `watches` (`user_sub`);
