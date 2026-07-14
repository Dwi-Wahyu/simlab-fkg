CREATE TABLE `scheduler_state` (
	`key` varchar(100) NOT NULL,
	`last_run_at` timestamp NOT NULL,
	CONSTRAINT `scheduler_state_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `lending` ADD `h1_reminder_sent_at` timestamp;--> statement-breakpoint
ALTER TABLE `lending` ADD `overdue_reminder_sent_at` timestamp;