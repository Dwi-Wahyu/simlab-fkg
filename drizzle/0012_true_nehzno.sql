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
ALTER TABLE `safety_incident` ADD CONSTRAINT `safety_incident_laboratorium_id_laboratorium_id_fk` FOREIGN KEY (`laboratorium_id`) REFERENCES `laboratorium`(`id`) ON DELETE no action ON UPDATE no action;