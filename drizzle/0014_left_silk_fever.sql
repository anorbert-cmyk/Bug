CREATE TABLE `admin_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationType` enum('circuit_breaker_open','high_failure_rate','critical_error','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`metadata` json,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`acknowledgedAt` timestamp,
	`acknowledgedBy` varchar(42),
	CONSTRAINT `admin_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysis_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`tier` enum('standard','medium','full') NOT NULL,
	`eventType` enum('request','part_complete','success','failure','retry','partial_success') NOT NULL,
	`durationMs` int,
	`partNumber` int,
	`errorCode` varchar(64),
	`errorMessage` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysis_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `circuit_breaker_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceName` varchar(64) NOT NULL,
	`cbState` enum('closed','open','half_open') NOT NULL DEFAULT 'closed',
	`failureCount` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`lastFailureAt` timestamp,
	`lastSuccessAt` timestamp,
	`openedAt` timestamp,
	`halfOpenAt` timestamp,
	`resetAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `circuit_breaker_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `circuit_breaker_state_serviceName_unique` UNIQUE(`serviceName`)
);
--> statement-breakpoint
CREATE TABLE `hourly_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hourStart` timestamp NOT NULL,
	`totalRequests` int NOT NULL DEFAULT 0,
	`successfulRequests` int NOT NULL DEFAULT 0,
	`failedRequests` int NOT NULL DEFAULT 0,
	`partialSuccesses` int NOT NULL DEFAULT 0,
	`retriedRequests` int NOT NULL DEFAULT 0,
	`avgDurationMs` int,
	`p50DurationMs` int,
	`p95DurationMs` int,
	`p99DurationMs` int,
	`tierStandard` int NOT NULL DEFAULT 0,
	`tierMedium` int NOT NULL DEFAULT 0,
	`tierFull` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hourly_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retry_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`tier` enum('standard','medium','full') NOT NULL,
	`problemStatement` text NOT NULL,
	`email` varchar(320),
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 5,
	`priority` int NOT NULL DEFAULT 1,
	`lastError` text,
	`lastAttemptAt` timestamp,
	`nextRetryAt` timestamp,
	`queueStatus` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retry_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `retry_queue_sessionId_unique` UNIQUE(`sessionId`)
);
