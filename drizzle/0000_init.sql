CREATE TABLE `discoveries` (
	`tmdb_id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`media_type` text DEFAULT 'movie' NOT NULL,
	`release_date` text,
	`poster_path` text,
	`overview` text,
	`first_seen_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `films` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer,
	`media_type` text DEFAULT 'movie' NOT NULL,
	`title` text NOT NULL,
	`release_date` text NOT NULL,
	`description` text,
	`description_source` text,
	`saga` text NOT NULL,
	`phase` integer NOT NULL,
	`poster_path` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `films_tmdb_id_unique` ON `films` (`tmdb_id`);--> statement-breakpoint
CREATE INDEX `films_release_date_idx` ON `films` (`release_date`);--> statement-breakpoint
CREATE TABLE `watches` (
	`user_sub` text NOT NULL,
	`film_id` text NOT NULL,
	`watched_at` text NOT NULL,
	PRIMARY KEY(`user_sub`, `film_id`),
	FOREIGN KEY (`film_id`) REFERENCES `films`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `watches_user_idx` ON `watches` (`user_sub`);