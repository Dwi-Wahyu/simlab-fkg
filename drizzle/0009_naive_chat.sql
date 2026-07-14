CREATE TABLE `practicum_criteria_band` (
	`id` varchar(36) NOT NULL,
	`criteria_id` varchar(36) NOT NULL,
	`min_score` int NOT NULL,
	`max_score` int NOT NULL,
	`label` varchar(100),
	`description` text NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_criteria_band_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_criteria_band` ADD CONSTRAINT `pcb_criteria_fk` FOREIGN KEY (`criteria_id`) REFERENCES `practicum_module_criteria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `practicum_criteria_band_criteria_idx` ON `practicum_criteria_band` (`criteria_id`);