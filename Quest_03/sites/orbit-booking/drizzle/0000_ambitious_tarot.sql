CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_state` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`retry_hash` text NOT NULL,
	`body_hash` text NOT NULL,
	`capability_hash` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL,
	`local_version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_requests_retry_hash_unique` ON `booking_requests` (`retry_hash`);