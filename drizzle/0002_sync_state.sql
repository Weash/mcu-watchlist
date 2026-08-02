CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`last_run_at` text NOT NULL,
	`last_report` text NOT NULL
);
