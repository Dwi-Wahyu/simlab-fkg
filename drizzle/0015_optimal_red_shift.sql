CREATE TABLE `practicum_logbook` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_logbook_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_logbook_entry` (
	`id` varchar(36) NOT NULL,
	`logbook_id` varchar(36) NOT NULL,
	`schedule_id` varchar(36),
	`file_url` text NOT NULL,
	`file_name` varchar(255),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_logbook_entry_id` PRIMARY KEY(`id`),
	CONSTRAINT `logbook_entry_unique_idx` UNIQUE(`logbook_id`,`schedule_id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_logbook_template` (
	`id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`template_file_path` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_logbook_template_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_logbook` ADD CONSTRAINT `practicum_logbook_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD CONSTRAINT `practicum_logbook_entry_logbook_id_practicum_logbook_id_fk` FOREIGN KEY (`logbook_id`) REFERENCES `practicum_logbook`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD CONSTRAINT `practicum_logbook_entry_schedule_id_practicum_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_template` ADD CONSTRAINT `practicum_logbook_template_module_id_practicum_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `logbook_user_idx` ON `practicum_logbook` (`user_id`);--> statement-breakpoint
CREATE INDEX `logbook_entry_logbook_idx` ON `practicum_logbook_entry` (`logbook_id`);--> statement-breakpoint
CREATE INDEX `logbook_entry_schedule_idx` ON `practicum_logbook_entry` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `logbook_template_module_idx` ON `practicum_logbook_template` (`module_id`);