ALTER TABLE `practicum_logbook` ADD `last_generated_at` timestamp;--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD `series_id` varchar(36);--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD CONSTRAINT `practicum_logbook_entry_series_id_practicum_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `practicum_series`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `logbook_entry_series_idx` ON `practicum_logbook_entry` (`series_id`);