ALTER TABLE `equipment` DROP INDEX `equipment_serial_number_unique`;--> statement-breakpoint
ALTER TABLE `laboratorium` DROP INDEX `laboratorium_slug_unique`;--> statement-breakpoint
ALTER TABLE `user` DROP INDEX `user_username_unique`;--> statement-breakpoint
ALTER TABLE `user` DROP INDEX `user_email_unique`;--> statement-breakpoint
ALTER TABLE `equipment` ADD `serial_number_active` varchar(100) GENERATED ALWAYS AS (IF(`is_deleted` = 0, `serial_number`, NULL)) STORED;--> statement-breakpoint
ALTER TABLE `laboratorium` ADD `slug_active` varchar(255) GENERATED ALWAYS AS (IF(`is_deleted` = 0, `slug`, NULL)) STORED;--> statement-breakpoint
ALTER TABLE `user` ADD `username_active` varchar(255) GENERATED ALWAYS AS (IF(`is_deleted` = 0, `username`, NULL)) STORED;--> statement-breakpoint
ALTER TABLE `user` ADD `email_active` varchar(255) GENERATED ALWAYS AS (IF(`is_deleted` = 0, `email`, NULL)) STORED;--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_active_uidx` ON `user` (`username_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_active_uidx` ON `user` (`email_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `laboratorium_slug_active_uidx` ON `laboratorium` (`slug_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_serial_number_active_uidx` ON `equipment` (`serial_number_active`);