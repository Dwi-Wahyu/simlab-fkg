ALTER TABLE `audit_log` ADD `status` varchar(20);--> statement-breakpoint
ALTER TABLE `audit_log` ADD `ip_address` varchar(45);--> statement-breakpoint
ALTER TABLE `audit_log` ADD `user_agent` text;--> statement-breakpoint
ALTER TABLE `practicum_class` ADD CONSTRAINT `practicum_class_unique_idx` UNIQUE(`batch`,`name`);