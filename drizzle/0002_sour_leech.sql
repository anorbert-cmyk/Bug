ALTER TABLE `purchases` MODIFY COLUMN `paymentMethod` enum('stripe','coinbase','paypal') NOT NULL;--> statement-breakpoint
ALTER TABLE `purchases` ADD `paypalOrderId` varchar(64);--> statement-breakpoint
ALTER TABLE `purchases` ADD `paypalCaptureId` varchar(64);