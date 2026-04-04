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
ALTER TABLE `maintenance_cost` ADD CONSTRAINT `maintenance_cost_maintenance_id_maintenance_id_fk` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance`(`id`) ON DELETE set null ON UPDATE no action;