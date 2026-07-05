CREATE TABLE `kelompok_mahasiswa` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`class_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kelompok_mahasiswa_id` PRIMARY KEY(`id`),
	CONSTRAINT `kelompok_mahasiswa_unique_idx` UNIQUE(`class_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `kelompok_mahasiswa_member` (
	`id` varchar(36) NOT NULL,
	`kelompok_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kelompok_mahasiswa_member_id` PRIMARY KEY(`id`),
	CONSTRAINT `kelompok_member_unique_idx` UNIQUE(`kelompok_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD `group_id` varchar(36);--> statement-breakpoint
ALTER TABLE `kelompok_mahasiswa` ADD CONSTRAINT `kelompok_mahasiswa_class_id_practicum_class_id_fk` FOREIGN KEY (`class_id`) REFERENCES `practicum_class`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kelompok_mahasiswa_member` ADD CONSTRAINT `kelompok_mahasiswa_member_kelompok_id_kelompok_mahasiswa_id_fk` FOREIGN KEY (`kelompok_id`) REFERENCES `kelompok_mahasiswa`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kelompok_mahasiswa_member` ADD CONSTRAINT `kelompok_mahasiswa_member_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `kelompok_mahasiswa_class_idx` ON `kelompok_mahasiswa` (`class_id`);--> statement-breakpoint
CREATE INDEX `kelompok_member_kelompok_idx` ON `kelompok_mahasiswa_member` (`kelompok_id`);--> statement-breakpoint
CREATE INDEX `kelompok_member_user_idx` ON `kelompok_mahasiswa_member` (`user_id`);--> statement-breakpoint
ALTER TABLE `practicum_schedule_instructor` ADD CONSTRAINT `ps_instr_group_fk` FOREIGN KEY (`group_id`) REFERENCES `kelompok_mahasiswa`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ps_instructor_group_idx` ON `practicum_schedule_instructor` (`group_id`);