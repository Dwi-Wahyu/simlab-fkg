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
	`status` varchar(20),
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `block` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`department_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `block_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `department` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `department_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` varchar(36) NOT NULL,
	`serial_number` varchar(100),
	`brand` varchar(100),
	`variant` varchar(255),
	`warehouse_id` varchar(36),
	`laboratorium_id` varchar(36),
	`item_id` varchar(36) NOT NULL,
	`condition` enum('BAIK','RUSAK') NOT NULL DEFAULT 'BAIK',
	`status` enum('READY','IN_USE','MAINTENANCE') DEFAULT 'READY',
	`storage_location` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_serial_number_unique` UNIQUE(`serial_number`)
);
--> statement-breakpoint
CREATE TABLE `equipment_category` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `equipment_category_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipment_category_name_unique` UNIQUE(`name`)
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
	`category_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`type` enum('ASSET','CONSUMABLE') NOT NULL,
	`equipment_type` enum('DENTAL_UNIT','LAB_INSTRUMENT','IMAGING','FURNITURE','INSTRUMENT','EQUIPMENT'),
	`min_stock` int DEFAULT 0,
	`qr_code_path` text,
	`base_unit` enum('PCS','BOX','METER','ROLL','UNIT','BOTOL') NOT NULL,
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
	`return_status` enum('BAIK','RUSAK'),
	`return_notes` text,
	`return_evidence_path` text,
	`returned_at` timestamp,
	CONSTRAINT `lending_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance` (
	`id` varchar(36) NOT NULL,
	`equipment_id` varchar(36),
	`maintenance_type` enum('PREVENTIF','KOREKTIF','KALIBRASI') NOT NULL,
	`description` text NOT NULL,
	`scheduled_date` timestamp NOT NULL,
	`completion_date` timestamp,
	`status` enum('PENDING','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'PENDING',
	`technician_id` varchar(36),
	`vendor` varchar(255),
	`expiry_date` timestamp,
	`certificate_path` text,
	`certificate_name` varchar(255),
	`cost` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_cost` (
	`id` varchar(36) NOT NULL,
	`maintenance_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`amount` int NOT NULL DEFAULT 0,
	`status` enum('LUNAS','MENUNGGU_PEMBAYARAN') NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN',
	`due_date` timestamp,
	`attachment_path` text,
	`attachment_name` varchar(255),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_cost_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_cost_item` (
	`id` varchar(36) NOT NULL,
	`cost_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`amount` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_cost_item_id` PRIMARY KEY(`id`)
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
CREATE TABLE `practicum_assessment` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`student_id` varchar(36) NOT NULL,
	`instructor_id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`notes` text,
	`practicum_assessment_status` enum('DRAFT','FINAL') NOT NULL DEFAULT 'FINAL',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_assessment_id` PRIMARY KEY(`id`),
	CONSTRAINT `practicum_assessment_unique_idx` UNIQUE(`schedule_id`,`student_id`,`module_id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_assessment_criteria_score` (
	`id` varchar(36) NOT NULL,
	`assessment_id` varchar(36) NOT NULL,
	`criteria_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_assessment_criteria_score_id` PRIMARY KEY(`id`),
	CONSTRAINT `assessment_criteria_score_unique_idx` UNIQUE(`assessment_id`,`criteria_id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_class` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`batch` varchar(4) NOT NULL,
	`academic_year` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_class_id` PRIMARY KEY(`id`),
	CONSTRAINT `practicum_class_unique_idx` UNIQUE(`batch`,`name`)
);
--> statement-breakpoint
CREATE TABLE `practicum_class_member` (
	`id` varchar(36) NOT NULL,
	`class_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_class_member_id` PRIMARY KEY(`id`),
	CONSTRAINT `practicum_class_member_unique_idx` UNIQUE(`class_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_logbook` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	`last_generated_at` timestamp,
	CONSTRAINT `practicum_logbook_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_logbook_entry` (
	`id` varchar(36) NOT NULL,
	`logbook_id` varchar(36) NOT NULL,
	`series_id` varchar(36),
	`schedule_id` varchar(36),
	`file_url` text NOT NULL,
	`file_name` varchar(255),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_logbook_entry_id` PRIMARY KEY(`id`),
	CONSTRAINT `logbook_entry_unique_idx` UNIQUE(`logbook_id`,`schedule_id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_logbook_generation` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`series_id` varchar(36) NOT NULL,
	`generated_file_name` varchar(255),
	`pdf_url` varchar(255),
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_logbook_generation_id` PRIMARY KEY(`id`),
	CONSTRAINT `logbook_gen_unique_idx` UNIQUE(`user_id`,`series_id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_logbook_template` (
	`id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`template_file_path` text NOT NULL,
	`table_builder_key` varchar(50),
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_logbook_template_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `practicum_module` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`block_id` varchar(36),
	`practicum_module_component` enum('PREPARASI','RESTORASI'),
	`practicum_module_scoring_mode` enum('TOTAL','RUBRIK') NOT NULL DEFAULT 'TOTAL',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_module_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_module_criteria` (
	`id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`max_score` int NOT NULL DEFAULT 100,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_module_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_schedule` (
	`id` varchar(36) NOT NULL,
	`series_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`practicum_type` enum('PELATIHAN','OSCE','PRAKTIKUM') NOT NULL,
	`practicum_class` enum('A','B','C') NOT NULL,
	`class_id` varchar(36),
	`module_id` varchar(36),
	`laboratorium_id` varchar(36) NOT NULL,
	`block_id` varchar(36),
	`semester` int,
	`start_time` timestamp NOT NULL,
	`end_time` timestamp NOT NULL,
	`participant_count` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practicum_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_schedule_instructor` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`instructor_id` varchar(36) NOT NULL,
	CONSTRAINT `practicum_schedule_instructor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_schedule_module` (
	`id` varchar(36) NOT NULL,
	`schedule_id` varchar(36) NOT NULL,
	`module_id` varchar(36) NOT NULL,
	CONSTRAINT `practicum_schedule_module_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `practicum_series` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`block_id` varchar(36),
	`laboratorium_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_series_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_incident` (
	`id` varchar(36) NOT NULL,
	`laboratorium_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` text,
	`incident_date` timestamp NOT NULL,
	`safety_incident_severity` enum('LOW','MEDIUM','HIGH') NOT NULL,
	`reporter_name` varchar(255),
	`capa` text,
	`safety_incident_status` enum('REPORTED','INVESTIGATING','ACTION_PLAN','MONITORING','CLOSED') NOT NULL DEFAULT 'REPORTED',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_incident_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock` (
	`id` varchar(36) NOT NULL,
	`item_id` varchar(36),
	`warehouse_id` varchar(36),
	`qty` int NOT NULL DEFAULT 0,
	`brand` varchar(100),
	`variant` varchar(255),
	`laboratorium_id` varchar(36),
	`condition` varchar(100) DEFAULT 'baik',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_unique_idx` UNIQUE(`item_id`,`laboratorium_id`,`brand`,`variant`)
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
	`capacity` int DEFAULT 0,
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
ALTER TABLE `block` ADD CONSTRAINT `block_department_id_department_id_fk` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_report` ADD CONSTRAINT `inventory_report_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_report` ADD CONSTRAINT `inventory_report_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item` ADD CONSTRAINT `item_category_id_equipment_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `equipment_category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `item_unit_conversion` ADD CONSTRAINT `item_unit_conversion_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending` ADD CONSTRAINT `lending_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_lending_id_lending_id_fk` FOREIGN KEY (`lending_id`) REFERENCES `lending`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lending_item` ADD CONSTRAINT `lending_item_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance` ADD CONSTRAINT `maintenance_technician_id_user_id_fk` FOREIGN KEY (`technician_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_cost` ADD CONSTRAINT `maintenance_cost_maintenance_id_maintenance_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_cost_item` ADD CONSTRAINT `maintenance_cost_item_cost_id_maintenance_cost_id_fk` FOREIGN KEY (`cost_id`) REFERENCES `maintenance_cost`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_equipment_id_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_from_warehouse_id_warehouse_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_to_warehouse_id_warehouse_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movement` ADD CONSTRAINT `movement_pic_id_user_id_fk` FOREIGN KEY (`pic_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_schedule_id_practicum_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_student_id_user_id_fk` FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_module_id_practicum_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment_criteria_score` ADD CONSTRAINT `pac_score_assessment_fk` FOREIGN KEY (`assessment_id`) REFERENCES `practicum_assessment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment_criteria_score` ADD CONSTRAINT `pac_score_criteria_fk` FOREIGN KEY (`criteria_id`) REFERENCES `practicum_module_criteria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_class_member` ADD CONSTRAINT `practicum_class_member_class_id_practicum_class_id_fk` FOREIGN KEY (`class_id`) REFERENCES `practicum_class`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_class_member` ADD CONSTRAINT `practicum_class_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook` ADD CONSTRAINT `practicum_logbook_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD CONSTRAINT `practicum_logbook_entry_logbook_id_practicum_logbook_id_fk` FOREIGN KEY (`logbook_id`) REFERENCES `practicum_logbook`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD CONSTRAINT `practicum_logbook_entry_series_id_practicum_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `practicum_series`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_entry` ADD CONSTRAINT `practicum_logbook_entry_schedule_id_practicum_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_generation` ADD CONSTRAINT `practicum_logbook_generation_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_generation` ADD CONSTRAINT `practicum_logbook_generation_series_id_practicum_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `practicum_series`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_template` ADD CONSTRAINT `practicum_logbook_template_module_id_practicum_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_logbook_template_field` ADD CONSTRAINT `practicum_logbook_template_field_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `practicum_logbook_template`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_module` ADD CONSTRAINT `practicum_module_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_module_criteria` ADD CONSTRAINT `pm_criteria_module_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_series_id_practicum_series_id_fk` FOREIGN KEY (`series_id`) REFERENCES `practicum_series`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_class_id_practicum_class_id_fk` FOREIGN KEY (`class_id`) REFERENCES `practicum_class`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_module_id_practicum_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `ps_instr_schedule_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `ps_instr_user_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_module` ADD CONSTRAINT `ps_mod_schedule_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule_module` ADD CONSTRAINT `ps_mod_module_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_series` ADD CONSTRAINT `practicum_series_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_series` ADD CONSTRAINT `practicum_series_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_incident` ADD CONSTRAINT `safety_incident_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_item_id_item_id_fk` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_warehouse_id_warehouse_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock` ADD CONSTRAINT `stock_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX `practicum_assessment_schedule_idx` ON `practicum_assessment` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `practicum_assessment_student_idx` ON `practicum_assessment` (`student_id`);--> statement-breakpoint
CREATE INDEX `practicum_assessment_instructor_idx` ON `practicum_assessment` (`instructor_id`);--> statement-breakpoint
CREATE INDEX `practicum_assessment_module_idx` ON `practicum_assessment` (`module_id`);--> statement-breakpoint
CREATE INDEX `assessment_criteria_score_assessment_idx` ON `practicum_assessment_criteria_score` (`assessment_id`);--> statement-breakpoint
CREATE INDEX `assessment_criteria_score_criteria_idx` ON `practicum_assessment_criteria_score` (`criteria_id`);--> statement-breakpoint
CREATE INDEX `practicum_class_member_class_idx` ON `practicum_class_member` (`class_id`);--> statement-breakpoint
CREATE INDEX `practicum_class_member_user_idx` ON `practicum_class_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `logbook_user_idx` ON `practicum_logbook` (`user_id`);--> statement-breakpoint
CREATE INDEX `logbook_entry_logbook_idx` ON `practicum_logbook_entry` (`logbook_id`);--> statement-breakpoint
CREATE INDEX `logbook_entry_series_idx` ON `practicum_logbook_entry` (`series_id`);--> statement-breakpoint
CREATE INDEX `logbook_entry_schedule_idx` ON `practicum_logbook_entry` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `logbook_gen_user_idx` ON `practicum_logbook_generation` (`user_id`);--> statement-breakpoint
CREATE INDEX `logbook_gen_series_idx` ON `practicum_logbook_generation` (`series_id`);--> statement-breakpoint
CREATE INDEX `logbook_template_module_idx` ON `practicum_logbook_template` (`module_id`);--> statement-breakpoint
CREATE INDEX `logbook_template_field_template_idx` ON `practicum_logbook_template_field` (`template_id`);--> statement-breakpoint
CREATE INDEX `practicum_module_criteria_module_idx` ON `practicum_module_criteria` (`module_id`);--> statement-breakpoint
CREATE INDEX `practicum_module_criteria_sort_idx` ON `practicum_module_criteria` (`module_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_laboratorium_idx` ON `practicum_schedule` (`laboratorium_id`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_series_idx` ON `practicum_schedule` (`series_id`);--> statement-breakpoint
CREATE INDEX `practicum_schedule_time_idx` ON `practicum_schedule` (`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `ps_instructor_schedule_idx` ON `practicum_schedule_instructor` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ps_instructor_user_idx` ON `practicum_schedule_instructor` (`instructor_id`);--> statement-breakpoint
CREATE INDEX `ps_module_schedule_idx` ON `practicum_schedule_module` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `ps_module_module_idx` ON `practicum_schedule_module` (`module_id`);--> statement-breakpoint
CREATE INDEX `stock_item_idx` ON `stock` (`item_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_key_userId_idx` ON `api_key` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);