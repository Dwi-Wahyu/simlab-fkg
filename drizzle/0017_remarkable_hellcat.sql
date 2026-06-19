CREATE TABLE `practicum_logbook_generation` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`series_id` varchar(36) NOT NULL,
	`generated_file_name` varchar(255),
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_logbook_generation_id` PRIMARY KEY(`id`),
	CONSTRAINT `logbook_gen_unique_idx` UNIQUE(`user_id`,`series_id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_logbook_generation` ADD CONSTRAINT `practicum_logbook_generation_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_generation` ADD CONSTRAINT `practicum_logbook_generation_series_id_practicum_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `practicum_series`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `logbook_gen_user_idx` ON `practicum_logbook_generation` (`user_id`);--> statement-breakpoint
CREATE INDEX `logbook_gen_series_idx` ON `practicum_logbook_generation` (`series_id`);