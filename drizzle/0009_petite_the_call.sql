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
ALTER TABLE `practicum_schedule` ADD `block_id` varchar(36);--> statement-breakpoint
ALTER TABLE `block` ADD CONSTRAINT `block_department_id_department_id_fk` FOREIGN KEY (`department_id`) REFERENCES `department`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE set null ON UPDATE no action;