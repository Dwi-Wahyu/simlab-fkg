CREATE TABLE `approval` (
	`id` varchar(36) NOT NULL,
	`reference_type` enum('LENDING','DISTRIBUTION','MAINTENANCE'),
	`reference_id` varchar(36),
	`approved_by` varchar(36),
	`status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_checklist` (
	`id` varchar(36) NOT NULL,
	`laboratorium_id` varchar(36),
	`auditor_id` varchar(36),
	`title` varchar(255),
	`score` int,
	`findings` text,
	`recommendations` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`action` varchar(50),
	`table_name` varchar(50),
	`record_id` varchar(36),
	`old_value` text,
	`new_value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` varchar(36) NOT NULL,
	`serial_number` varchar(100),
	`brand` varchar(100),
	`warehouse_id` varchar(36),
	`laboratorium_id` varchar(36),
	`item_id` varchar(36) NOT NULL,
	`condition` enum('BAIK','RUSAK_RINGAN','RUSAK_BERAT') NOT NULL DEFAULT 'BAIK',
	`status` enum('READY','IN_USE','MAINTENANCE') DEFAULT 'READY',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_serial_number_unique` UNIQUE(`serial_number`)
);
--> statement-breakpoint
CREATE TABLE `inventory_report` (
	`id` varchar(36) NOT NULL,
	`laboratorium_id` varchar(36),
	`period_month` int,
	`period_year` int,
	`item_id` varchar(36),
	`opening_qty` int,
	`in_qty` int,
	`out_qty` int,
	`closing_qty` int,
	`status` enum('DRAFT','SIGNED_BY_KEPALA_LAB','SUBMITTED_TO_SPMI'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `inventory_report_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('ASSET','CONSUMABLE') NOT NULL,
	`equipment_type` enum('DENTAL_UNIT','LAB_INSTRUMENT','IMAGING'),
	`base_unit` enum('PCS','BOX','METER','ROLL','UNIT') NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_unit_conversion` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`from_unit` varchar(20) NOT NULL,
	`to_unit` varchar(20) NOT NULL,
	`multiplier` int NOT NULL,
	CONSTRAINT `item_unit_conversion_id` PRIMARY KEY(`id`),
	CONSTRAINT `item_unit_conversion_item_id_from_unit_to_unit_unique` UNIQUE(`item_id`,`from_unit`,`to_unit`)
);
--> statement-breakpoint
CREATE TABLE `lending` (
	`id` varchar(36) NOT NULL,
	`unit` varchar(100) NOT NULL,
	`purpose` enum('PRAKTIKUM','PENELITIAN_DOSEN','PENGABDIAN_MASYARAKAT') NOT NULL,
	`status` enum('DRAFT','APPROVED','REJECTED','DIPINJAM','RETURNED') DEFAULT 'DRAFT',
	`rejected_reason` text,
	`requested_by` varchar(36),
	`laboratorium_id` varchar(36),
	`approved_by` varchar(36),
	`attachment_path` text,
	`attachment_name` varchar(255),
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lending_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lending_item` (
	`id` varchar(36) NOT NULL,
	`lending_id` varchar(36),
	`equipment_id` varchar(36),
	`qty` int DEFAULT 1,
	CONSTRAINT `lending_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`maintenance_type` enum('PERAWATAN','PERBAIKAN') NOT NULL,
	`description` text NOT NULL,
	`scheduled_date` timestamp NOT NULL,
	`completion_date` timestamp,
	`status` enum('PENDING','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'PENDING',
	`technician_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `movement` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`equipment_id` varchar(36),
	`movement_event_type` enum('RECEIVE','ISSUE','ADJUSTMENT','TRANSFER_OUT','TRANSFER_IN','LENDING_OUT','LENDING_RETURN','MAINTENANCE_IN','MAINTENANCE_OUT') NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	`unit` varchar(20),
	`movement_classification` enum('GUDANG_PUSAT','LAB_UNIT','VENDOR_REPAIR'),
	`specific_location_name` varchar(255),
	`from_warehouse_id` varchar(36),
	`to_warehouse_id` varchar(36),
	`laboratorium_id` varchar(36),
	`notes` text,
	`pic_id` varchar(36),
	`movement_reference_type` enum('LENDING','DISTRIBUTION','MAINTENANCE'),
	`reference_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`laboratorium_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`notification_priority` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
	`read` boolean NOT NULL DEFAULT false,
	`action` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`warehouse_id` varchar(36),
	`qty` int NOT NULL DEFAULT 0,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_unique_idx` UNIQUE(`item_id`,`warehouse_id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouse_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waste_log` (
	`id` varchar(36) NOT NULL,
	`laboratorium_id` varchar(36),
	`waste_type` enum('INFEKSIUS','TAJAM','KIMIA','RADIOAKTIF') NOT NULL,
	`weight_gram` int NOT NULL,
	`pic_id` varchar(36),
	`disposal_status` enum('STORED','COLLECTED_BY_THIRD_PARTY','INCINERATED'),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `waste_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_key` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`name` text,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`expires_at` timestamp(3),
	`last_used_at` timestamp(3),
	CONSTRAINT `api_key_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_key_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `laboratorium` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`slug` varchar(255),
	`logo` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`metadata` text,
	CONSTRAINT `laboratorium_id` PRIMARY KEY(`id`),
	CONSTRAINT `laboratorium_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `laboratorium_member` (
	`id` varchar(36) NOT NULL,
	`laboratorium_id` varchar(36),
	`user_id` varchar(36),
	`role` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `laboratorium_member_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`displayUsername` varchar(255),
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`role` varchar(255) NOT NULL,
	`image` text,
	`banned` boolean,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `approval` ADD CONSTRAINT `approval_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD CONSTRAINT `audit_checklist_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD CONSTRAINT `audit_checklist_auditor_id_user_id_fk` FOREIGN KEY (`auditor_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_report` ADD CONSTRAINT `inventory_report_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_report` ADD CONSTRAINT `inventory_report_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_unit_conversion` ADD CONSTRAINT `item_unit_conversion_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_lending_id_lending_id_fk` FOREIGN KEY (`lending_id`) REFERENCES `lending`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_technician_id_user_id_fk` FOREIGN KEY (`technician_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_from_warehouse_id_warehouse_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_to_warehouse_id_warehouse_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_pic_id_user_id_fk` FOREIGN KEY (`pic_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waste_log` ADD CONSTRAINT `waste_log_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `waste_log` ADD CONSTRAINT `waste_log_pic_id_user_id_fk` FOREIGN KEY (`pic_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_key` ADD CONSTRAINT `api_key_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `laboratorium_member` ADD CONSTRAINT `laboratorium_member_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `laboratorium_member` ADD CONSTRAINT `laboratorium_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `equipment_condition_idx` ON `equipment` (`condition`);--> statement-breakpoint
CREATE INDEX `equipment_item_id_idx` ON `equipment` (`item_id`);--> statement-breakpoint
CREATE INDEX `movement_item_idx` ON `movement` (`item_id`);--> statement-breakpoint
CREATE INDEX `movement_equipment_idx` ON `movement` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `movement_from_warehouse_idx` ON `movement` (`from_warehouse_id`);--> statement-breakpoint
CREATE INDEX `movement_to_warehouse_idx` ON `movement` (`to_warehouse_id`);--> statement-breakpoint
CREATE INDEX `movement_laboratorium_idx` ON `movement` (`laboratorium_id`);--> statement-breakpoint
CREATE INDEX `movement_reference_idx` ON `movement` (`reference_id`);--> statement-breakpoint
CREATE INDEX `notification_userId_idx` ON `notification` (`user_id`);--> statement-breakpoint
CREATE INDEX `notification_laboratoriumId_idx` ON `notification` (`laboratorium_id`);--> statement-breakpoint
CREATE INDEX `notification_read_idx` ON `notification` (`read`);--> statement-breakpoint
CREATE INDEX `stock_item_idx` ON `stock` (`item_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_key_userId_idx` ON `api_key` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);