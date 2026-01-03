ALTER TABLE `email_subscribers` ADD `verificationToken` varchar(64);--> statement-breakpoint
ALTER TABLE `email_subscribers` ADD `verificationSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_subscribers` ADD `isVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `email_subscribers` ADD `verifiedAt` timestamp;