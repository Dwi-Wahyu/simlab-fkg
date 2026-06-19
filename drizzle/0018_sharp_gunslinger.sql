CREATE TABLE `practicum_logbook_template_field` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`placeholder_key` varchar(100) NOT NULL,
	`label` varchar(255) NOT NULL,
	`practicum_logbook_template_field_type` enum('text','html','image') NOT NULL DEFAULT 'text',
	`practicum_logbook_template_field_source` enum('auto','manual') NOT NULL DEFAULT 'auto',
	`auto_source_path` varchar(255),
	`required` boolean NOT NULL DEFAULT false,
	`default_value` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_logbook_template_field_id` PRIMARY KEY(`id`),
	CONSTRAINT `logbook_template_field_unique_idx` UNIQUE(`template_id`,`placeholder_key`)
);
--> statement-breakpoint
ALTER TABLE `practicum_logbook_template` ADD `table_builder_key` varchar(50);--> statement-breakpoint
ALTER TABLE `practicum_logbook_template` ADD `description` text;--> statement-breakpoint
ALTER TABLE `practicum_logbook_template_field` ADD CONSTRAINT `practicum_logbook_template_field_template_id_practicum_logbook_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `practicum_logbook_template`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `logbook_template_field_template_idx` ON `practicum_logbook_template_field` (`template_id`);