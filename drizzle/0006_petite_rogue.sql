ALTER TABLE `audit_checklist` DROP FOREIGN KEY `audit_checklist_laboratorium_id_laboratorium_id_fk`;
--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP FOREIGN KEY `audit_checklist_auditor_id_user_id_fk`;
--> statement-breakpoint
ALTER TABLE `audit_checklist` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD `nama` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD `institusi` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD `tanggal` date NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD `deskripsi` text;--> statement-breakpoint
ALTER TABLE `audit_checklist` ADD `sertifikat` varchar(255);--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP COLUMN `laboratorium_id`;--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP COLUMN `auditor_id`;--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP COLUMN `title`;--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP COLUMN `score`;--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP COLUMN `findings`;--> statement-breakpoint
ALTER TABLE `audit_checklist` DROP COLUMN `recommendations`;