CREATE TABLE `stock_batch` (
	`id` varchar(36) NOT NULL,
	`stock_id` varchar(36) NOT NULL,
	`qty` int NOT NULL DEFAULT 0,
	`initial_qty` int NOT NULL,
	`expiry_date` date,
	`received_at` timestamp NOT NULL DEFAULT (now()),
	`movement_id` varchar(36),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_batch_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stock_batch` ADD CONSTRAINT `stock_batch_stock_id_stock_id_fk` FOREIGN KEY (`stock_id`) REFERENCES `stock`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batch` ADD CONSTRAINT `stock_batch_movement_id_movement_id_fk` FOREIGN KEY (`movement_id`) REFERENCES `movement`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stock_batch_stock_idx` ON `stock_batch` (`stock_id`);--> statement-breakpoint
CREATE INDEX `stock_batch_expiry_idx` ON `stock_batch` (`expiry_date`);