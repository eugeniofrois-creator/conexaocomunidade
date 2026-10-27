CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`address` text NOT NULL,
	`hours` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`lat` real,
	`lng` real,
	`photo` text,
	`status` text DEFAULT 'Registrado' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_entries_owner` ON `entries` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_entries_created_at` ON `entries` (`created_at`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`neighborhood` text NOT NULL,
	`created_at` integer NOT NULL
);
