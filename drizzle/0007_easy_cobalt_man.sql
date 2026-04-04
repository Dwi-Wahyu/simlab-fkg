CREATE TABLE `practicum_schedule_instructor` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`instructor_id` varchar(36) NOT NULL,
	CONSTRAINT `practicum_schedule_instructor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_schedule` DROP FOREIGN KEY `practicum_schedule_instructor_id_user_id_fk`;
--> statement-breakpoint
DROP INDEX `practicum_schedule_instructor_idx` ON `practicum_schedule`;--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `practicum_schedule_instructor_schedule_id_practicum_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `practicum_schedule_instructor_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `practicum_schedule_instructor_schedule_idx` ON `practicum_schedule_instructor` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_instructor_user_idx` ON `practicum_schedule_instructor` (`instructor_id`);--> statement-breakpoint
ALTER TABLE `practicum_schedule` DROP COLUMN `instructor_id`;