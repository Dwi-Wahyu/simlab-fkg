CREATE TABLE `practicum_schedule_class` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`class_id` varchar(36) NOT NULL,
	CONSTRAINT `practicum_schedule_class_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_schedule_class` ADD CONSTRAINT `ps_cls_schedule_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_class` ADD CONSTRAINT `ps_cls_class_fk` FOREIGN KEY (`class_id`) REFERENCES `practicum_class`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ps_class_schedule_idx` ON `practicum_schedule_class` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ps_class_class_idx` ON `practicum_schedule_class` (`class_id`);