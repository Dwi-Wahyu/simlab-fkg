ALTER TABLE `maintenance` ADD `vendor` varchar(255);--> statement-breakpoint
ALTER TABLE `maintenance` ADD `expiry_date` timestamp;--> statement-breakpoint
ALTER TABLE `maintenance` ADD `certificate_path` text;--> statement-breakpoint
ALTER TABLE `maintenance` ADD `certificate_name` varchar(255);