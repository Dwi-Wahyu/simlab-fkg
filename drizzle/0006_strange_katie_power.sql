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
ALTER TABLE `maintenance_cost_item` ADD CONSTRAINT `maintenance_cost_item_cost_id_maintenance_cost_id_fk` FOREIGN KEY (`cost_id`) REFERENCES `maintenance_cost`(`id`) ON DELETE cascade ON UPDATE no action;