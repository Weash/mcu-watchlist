-- Adds the five new film-spec columns and the watches rating, all nullable.
--
-- Plain `ADD COLUMN`s, no table rebuild needed: nothing here is NOT NULL yet,
-- so SQLite's normal ALTER TABLE path handles it. Migration 0006 makes the
-- films columns required once the backfill in 0005 has run.

ALTER TABLE `films` ADD `poster_url` text;--> statement-breakpoint
ALTER TABLE `films` ADD `recap` text;--> statement-breakpoint
ALTER TABLE `films` ADD `duration` integer;--> statement-breakpoint
ALTER TABLE `films` ADD `director` text;--> statement-breakpoint
ALTER TABLE `films` ADD `post_credits_scenes` integer;--> statement-breakpoint
ALTER TABLE `watches` ADD `rating` integer;
