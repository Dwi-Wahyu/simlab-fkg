CREATE TABLE `practicum_schedule_module` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	CONSTRAINT `practicum_schedule_module_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_schedule_module` ADD CONSTRAINT `ps_mod_schedule_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_module` ADD CONSTRAINT `ps_mod_module_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ps_module_schedule_idx` ON `practicum_schedule_module` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ps_module_module_idx` ON `practicum_schedule_module` (`module_id`);