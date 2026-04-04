ALTER TABLE `maintenance` MODIFY COLUMN `maintenance_type` enum('PREVENTIF','KOREKTIF','KALIBRASI') NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance` ADD `cost` int DEFAULT 0;