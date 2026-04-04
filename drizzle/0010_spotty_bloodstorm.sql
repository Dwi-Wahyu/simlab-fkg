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
CREATE TABLE `practicum_class` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`batch` varchar(4) NOT NULL,
	`academic_year` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_class_id` PRIMARY KEY(`id`)
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
CREATE TABLE `practicum_module` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`block_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `practicum_module_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `class_id` varchar(36);--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD `module_id` varchar(36);--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_schedule_id_practicum_schedule_id_fk` FOREIGN KEY (`schedule_id`) REFERENCES `practicum_schedule`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_student_id_user_id_fk` FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_instructor_id_user_id_fk` FOREIGN KEY (`instructor_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_assessment` ADD CONSTRAINT `practicum_assessment_module_id_practicum_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_class_member` ADD CONSTRAINT `practicum_class_member_class_id_practicum_class_id_fk` FOREIGN KEY (`class_id`) REFERENCES `practicum_class`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_class_member` ADD CONSTRAINT `practicum_class_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_module` ADD CONSTRAINT `practicum_module_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `practicum_assessment_schedule_idx` ON `practicum_assessment` (`schedule_id`);--> statement-breakpoint
CREATE INDEX `practicum_assessment_student_idx` ON `practicum_assessment` (`student_id`);--> statement-breakpoint
CREATE INDEX `practicum_assessment_instructor_idx` ON `practicum_assessment` (`instructor_id`);--> statement-breakpoint
CREATE INDEX `practicum_assessment_module_idx` ON `practicum_assessment` (`module_id`);--> statement-breakpoint
CREATE INDEX `practicum_class_member_class_idx` ON `practicum_class_member` (`class_id`);--> statement-breakpoint
CREATE INDEX `practicum_class_member_user_idx` ON `practicum_class_member` (`user_id`);--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_class_id_practicum_class_id_fk` FOREIGN KEY (`class_id`) REFERENCES `practicum_class`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `practicum_schedule` ADD CONSTRAINT `practicum_schedule_module_id_practicum_module_id_fk` FOREIGN KEY (`module_id`) REFERENCES `practicum_module`(`id`) ON DELETE set null ON UPDATE no action;