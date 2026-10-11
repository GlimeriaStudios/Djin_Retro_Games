CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`state` text DEFAULT '{}' NOT NULL,
	`config` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seats` (
	`room` text NOT NULL,
	`slot` integer NOT NULL,
	`token` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`input` text DEFAULT '{}' NOT NULL,
	`updated` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`room`, `slot`)
);
