CREATE TABLE `admin_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletAddress` varchar(42) NOT NULL,
	`challenge` varchar(64) NOT NULL,
	`timestamp` bigint NOT NULL,
	`expiresAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_challenges_walletAddress_unique` UNIQUE(`walletAddress`)
);
