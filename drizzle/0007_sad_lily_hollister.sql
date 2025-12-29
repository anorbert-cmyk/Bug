CREATE TABLE `email_opens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trackingId` varchar(64) NOT NULL,
	`subscriberId` int,
	`email` varchar(320) NOT NULL,
	`emailNumber` int NOT NULL,
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`userAgent` text,
	`ipAddress` varchar(45),
	CONSTRAINT `email_opens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_opens_trackingId_unique` UNIQUE(`trackingId`)
);
--> statement-breakpoint
ALTER TABLE `email_opens` ADD CONSTRAINT `email_opens_subscriberId_email_subscribers_id_fk` FOREIGN KEY (`subscriberId`) REFERENCES `email_subscribers`(`id`) ON DELETE no action ON UPDATE no action;