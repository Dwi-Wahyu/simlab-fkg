ALTER TABLE `practicum_module` MODIFY COLUMN `practicum_module_scoring_mode` enum('TOTAL','RUBRIK','CHECKLIST') NOT NULL DEFAULT 'TOTAL';--> statement-breakpoint
ALTER TABLE `practicum_module` ADD `group_label` varchar(255);--> statement-breakpoint
ALTER TABLE `practicum_module` ADD `score_legend` json;--> statement-breakpoint
ALTER TABLE `practicum_module_criteria` ADD `section_label` varchar(255);