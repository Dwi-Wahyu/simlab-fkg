ALTER TABLE `practicum_logbook_template_field` DROP FOREIGN KEY `practicum_logbook_template_field_template_id_practicum_logbook_template_id_fk`;
--> statement-breakpoint
ALTER TABLE `practicum_logbook_generation` ADD `pdf_url` varchar(255);--> statement-breakpoint
ALTER TABLE `practicum_logbook_template_field` ADD CONSTRAINT `practicum_logbook_template_field_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `practicum_logbook_template`(`id`) ON DELETE cascade ON UPDATE no action;