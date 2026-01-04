CREATE TABLE `admin_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminWallet` varchar(42) NOT NULL,
	`action` enum('view_analysis','view_partial_results','trigger_regeneration','pause_operation','resume_operation','cancel_operation','modify_priority','acknowledge_alert','reset_circuit_breaker','export_data','other') NOT NULL,
	`targetType` enum('analysis','operation','user','system') NOT NULL,
	`targetId` varchar(64),
	`requestDetails` json,
	`success` boolean NOT NULL DEFAULT true,
	`resultDetails` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysis_operation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operationId` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`eventType` enum('operation_started','part_started','part_completed','part_failed','operation_completed','operation_failed','operation_paused','operation_resumed','operation_cancelled','operation_retried','admin_intervention') NOT NULL,
	`partNumber` int,
	`previousState` varchar(32),
	`newState` varchar(32),
	`errorCode` varchar(64),
	`errorMessage` text,
	`durationMs` int,
	`tokenCount` int,
	`actorType` enum('system','admin','user') NOT NULL DEFAULT 'system',
	`actorId` varchar(64),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysis_operation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysis_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`operationId` varchar(64) NOT NULL,
	`tier` enum('standard','medium','full') NOT NULL,
	`operationState` enum('initialized','generating','part_completed','paused','failed','completed','cancelled') NOT NULL DEFAULT 'initialized',
	`totalParts` int NOT NULL,
	`completedParts` int NOT NULL DEFAULT 0,
	`currentPart` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`lastPartCompletedAt` timestamp,
	`completedAt` timestamp,
	`estimatedCompletionAt` timestamp,
	`lastError` text,
	`lastErrorAt` timestamp,
	`failedPart` int,
	`retryCount` int NOT NULL DEFAULT 0,
	`triggeredBy` enum('user','system','admin','retry_queue') NOT NULL DEFAULT 'user',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analysis_operations_id` PRIMARY KEY(`id`),
	CONSTRAINT `analysis_operations_operationId_unique` UNIQUE(`operationId`)
);
