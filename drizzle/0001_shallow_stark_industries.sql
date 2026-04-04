CREATE TABLE `practicum_schedule` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`practicum_type` enum('PELATIHAN','OSCE','PRAKTIKUM') NOT NULL,
	`practicum_class` enum('A','B','C') NOT NULL,
	`laboratorium_id` varchar(36) NOT NULL,
	`instructor_id` varchar(36) NOT NULL,
	`start_time` timestamp NOT NULL,
	`end_time` timestamp NOT NULL,
	`participant_count` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `item` MODIFY COLUMN `equipment_type` enum('DENTAL_UNIT','LAB_INSTRUMENT','IMAGING','FURNITURE','INSTRUMENT','EQUIPMENT');--> statement-breakpoint
ALTER TABLE `item` ADD `min_stock` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `item` ADD `qr_code_path` text;--> statement-breakpoint
ALTER TABLE `laboratorium` ADD `capacity` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `practicum_schedule_laboratorium_idx` ON `practicum_schedule` (`laboratorium_id`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_instructor_idx` ON `practicum_schedule` (`instructor_id`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_time_idx` ON `practicum_schedule` (`start_time`,`end_time`);