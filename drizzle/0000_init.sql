CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`anon_key` text NOT NULL,
	`interval_minutes` integer DEFAULT 360 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`success` integer NOT NULL,
	`status_code` integer,
	`latency_ms` integer NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
