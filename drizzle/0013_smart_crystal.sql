CREATE TABLE `processed_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` varchar(255) NOT NULL,
	`paymentProvider` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`paymentId` varchar(255),
	`status` varchar(64) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processed_webhooks_id` PRIMARY KEY(`id`),
	CONSTRAINT `processed_webhooks_webhookId_unique` UNIQUE(`webhookId`)
);
