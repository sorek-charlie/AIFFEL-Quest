CREATE TABLE `owner_relay` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`payload` text NOT NULL,
	`response` text,
	`expires_at` integer NOT NULL
);
