ALTER TABLE `practicum_schedule_instructor` DROP FOREIGN KEY `practicum_schedule_instructor_schedule_id_practicum_schedule_id_fk`;
--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` DROP FOREIGN KEY `practicum_schedule_instructor_instructor_id_user_id_fk`;
--> statement-breakpoint
DROP INDEX `practicum_schedule_instructor_schedule_idx` ON `practicum_schedule_instructor`;--> statement-breakpoint
DROP INDEX `practicum_schedule_instructor_user_idx` ON `practicum_schedule_instructor`;--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `ps_instr_schedule_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `ps_instr_user_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ps_instructor_schedule_idx` ON `practicum_schedule_instructor` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ps_instructor_user_idx` ON `practicum_schedule_instructor` (`instructor_id`);