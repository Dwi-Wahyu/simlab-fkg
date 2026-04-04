ALTER TABLE `lending_item` ADD `return_status` enum('BAIK','RUSAK_RINGAN','RUSAK_BERAT');--> statement-breakpoint
ALTER TABLE `lending_item` ADD `return_notes` text;--> statement-breakpoint
ALTER TABLE `lending_item` ADD `return_evidence_path` text;--> statement-breakpoint
ALTER TABLE `lending_item` ADD `returned_at` timestamp;