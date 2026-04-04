CREATE TABLE `practicum_series` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`block_id` varchar(36),
	`laboratorium_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_series_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `series_id` varchar(36);--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `semester` int;--> statement-breakpoint
ALTER TABLE `practicum_series` ADD CONSTRAINT `practicum_series_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_series` ADD CONSTRAINT `practicum_series_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_series_id_practicum_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `practicum_series`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `practicum_schedule_series_idx` ON `practicum_schedule` (`series_id`);