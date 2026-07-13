ALTER TABLE `equipment` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `equipment` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `item` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `item` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `item` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `kelompok_mahasiswa` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `kelompok_mahasiswa` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `kelompok_mahasiswa` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `practicum_module` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `practicum_module` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `practicum_module` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `stock_batch` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `stock_batch` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `stock_batch` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `laboratorium` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `laboratorium` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `laboratorium` ADD `deleted_by` varchar(36);--> statement-breakpoint
ALTER TABLE `user` ADD `is_deleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `user` ADD `deleted_by` varchar(36);--> statement-breakpoint
CREATE INDEX `equipment_is_deleted_idx` ON `equipment` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `equipment_is_deleted_item_idx` ON `equipment` (`is_deleted`,`item_id`);--> statement-breakpoint
CREATE INDEX `item_is_deleted_idx` ON `item` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `item_is_deleted_category_idx` ON `item` (`is_deleted`,`category_id`);--> statement-breakpoint
CREATE INDEX `item_is_deleted_type_idx` ON `item` (`is_deleted`,`type`);--> statement-breakpoint
CREATE INDEX `kelompok_mahasiswa_is_deleted_idx` ON `kelompok_mahasiswa` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `practicum_module_is_deleted_idx` ON `practicum_module` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_is_deleted_idx` ON `practicum_schedule` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_is_deleted_time_idx` ON `practicum_schedule` (`is_deleted`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `stock_batch_is_deleted_idx` ON `stock_batch` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `stock_batch_is_deleted_stock_idx` ON `stock_batch` (`is_deleted`,`stock_id`);--> statement-breakpoint
CREATE INDEX `laboratorium_is_deleted_idx` ON `laboratorium` (`is_deleted`);--> statement-breakpoint
CREATE INDEX `user_is_deleted_idx` ON `user` (`is_deleted`);