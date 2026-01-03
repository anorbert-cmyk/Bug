/**
 * Admin Alerts Service
 * 
 * Sends email notifications to admin for critical errors:
 * - Circuit breaker opens
 * - High failure rate detected
 * - Critical system errors
 */

import { getDb } from "../db";
import { adminNotifications } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";

// ============================================================================
// TYPES
// ============================================================================

export type AlertType = 
  | "circuit_breaker_open" 
  | "high_failure_rate" 
  | "critical_error" 
  | "system_alert";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertParams {
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

// Prevent alert spam - track recent alerts
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same alerts

function getAlertKey(type: AlertType, metadata?: Record<string, unknown>): string {
  const baseKey = type;
  if (metadata?.service) {
    return `${baseKey}:${metadata.service}`;
  }
  return baseKey;
}

function canSendAlert(key: string): boolean {
  const lastSent = recentAlerts.get(key);
  if (!lastSent) return true;
  
  const elapsed = Date.now() - lastSent;
  return elapsed >= ALERT_COOLDOWN_MS;
}

function markAlertSent(key: string): void {
  recentAlerts.set(key, Date.now());
  
  // Clean up old entries
  const cutoff = Date.now() - ALERT_COOLDOWN_MS * 2;
  const entries = Array.from(recentAlerts.entries());
  for (const [k, v] of entries) {
    if (v < cutoff) {
      recentAlerts.delete(k);
    }
  }
}

// ============================================================================
// ALERT FUNCTIONS
// ============================================================================

/**
 * Send an admin alert notification
 */
export async function sendAdminAlert(params: AlertParams): Promise<boolean> {
  const alertKey = getAlertKey(params.type, params.metadata);
  
  // Check rate limiting
  if (!canSendAlert(alertKey)) {
    console.log(`[AdminAlerts] Skipping duplicate alert: ${alertKey}`);
    return false;
  }

  try {
    // Log to database
    await logAlertToDatabase(params);
    
    // Send notification to owner
    const success = await notifyOwner({
      title: `[${params.severity.toUpperCase()}] ${params.title}`,
      content: formatAlertContent(params),
    });

    if (success) {
      markAlertSent(alertKey);
      console.log(`[AdminAlerts] Alert sent: ${params.title}`);
    } else {
      console.warn(`[AdminAlerts] Failed to send alert: ${params.title}`);
    }

    return success;
  } catch (error) {
    console.error("[AdminAlerts] Error sending alert:", error);
    return false;
  }
}

/**
 * Format alert content for notification
 */
function formatAlertContent(params: AlertParams): string {
  const lines = [
    `**Alert Type:** ${params.type}`,
    `**Severity:** ${params.severity}`,
    "",
    params.message,
  ];

  if (params.metadata && Object.keys(params.metadata).length > 0) {
    lines.push("");
    lines.push("**Details:**");
    for (const [key, value] of Object.entries(params.metadata)) {
      lines.push(`- ${key}: ${JSON.stringify(value)}`);
    }
  }

  lines.push("");
  lines.push(`*Timestamp: ${new Date().toISOString()}*`);

  return lines.join("\n");
}

/**
 * Log alert to database for audit trail
 */
async function logAlertToDatabase(params: AlertParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(adminNotifications).values({
      notificationType: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("[AdminAlerts] Failed to log alert to database:", error);
  }
}

// ============================================================================
// SPECIFIC ALERT FUNCTIONS
// ============================================================================

/**
 * Alert when circuit breaker opens
 */
export async function alertCircuitBreakerOpen(
  serviceName: string,
  failureCount: number,
  lastError?: string
): Promise<boolean> {
  return sendAdminAlert({
    type: "circuit_breaker_open",
    title: `Circuit Breaker Opened: ${serviceName}`,
    message: `The circuit breaker for ${serviceName} has opened due to repeated failures. ` +
      `The service will be temporarily unavailable to prevent cascading failures. ` +
      `Manual intervention may be required.`,
    severity: "critical",
    metadata: {
      service: serviceName,
      failureCount,
      lastError: lastError?.substring(0, 500),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Alert when failure rate exceeds threshold
 */
export async function alertHighFailureRate(
  failureRate: number,
  threshold: number,
  timeWindowMinutes: number,
  recentErrors: string[]
): Promise<boolean> {
  return sendAdminAlert({
    type: "high_failure_rate",
    title: `High Failure Rate Detected: ${failureRate.toFixed(1)}%`,
    message: `The analysis failure rate has exceeded the threshold of ${threshold}%. ` +
      `${failureRate.toFixed(1)}% of requests in the last ${timeWindowMinutes} minutes have failed. ` +
      `Please investigate the root cause.`,
    severity: failureRate > 50 ? "critical" : "warning",
    metadata: {
      failureRate,
      threshold,
      timeWindowMinutes,
      recentErrors: recentErrors.slice(0, 5),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Alert for critical system errors
 */
export async function alertCriticalError(
  errorType: string,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<boolean> {
  return sendAdminAlert({
    type: "critical_error",
    title: `Critical Error: ${errorType}`,
    message: errorMessage,
    severity: "critical",
    metadata: {
      errorType,
      ...context,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Alert for system-level issues
 */
export async function alertSystemIssue(
  title: string,
  message: string,
  severity: AlertSeverity = "warning",
  metadata?: Record<string, unknown>
): Promise<boolean> {
  return sendAdminAlert({
    type: "system_alert",
    title,
    message,
    severity,
    metadata,
  });
}

// ============================================================================
// FAILURE RATE MONITORING
// ============================================================================

interface FailureRateWindow {
  requests: number;
  failures: number;
  windowStart: number;
}

const failureRateWindow: FailureRateWindow = {
  requests: 0,
  failures: 0,
  windowStart: Date.now(),
};

const FAILURE_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FAILURE_RATE_THRESHOLD = 30; // 30% failure rate triggers alert
const MIN_REQUESTS_FOR_ALERT = 10; // Need at least 10 requests to calculate rate

/**
 * Record a request for failure rate monitoring
 */
export function recordRequestForFailureRate(success: boolean): void {
  const now = Date.now();
  
  // Reset window if expired
  if (now - failureRateWindow.windowStart > FAILURE_RATE_WINDOW_MS) {
    failureRateWindow.requests = 0;
    failureRateWindow.failures = 0;
    failureRateWindow.windowStart = now;
  }
  
  failureRateWindow.requests++;
  if (!success) {
    failureRateWindow.failures++;
  }
  
  // Check if we should alert
  if (failureRateWindow.requests >= MIN_REQUESTS_FOR_ALERT) {
    const failureRate = (failureRateWindow.failures / failureRateWindow.requests) * 100;
    
    if (failureRate >= FAILURE_RATE_THRESHOLD) {
      // Async alert - don't block
      alertHighFailureRate(
        failureRate,
        FAILURE_RATE_THRESHOLD,
        FAILURE_RATE_WINDOW_MS / 60000,
        [] // Recent errors would be populated from error monitoring
      ).catch(console.error);
    }
  }
}

/**
 * Get current failure rate stats
 */
export function getFailureRateStats(): {
  requests: number;
  failures: number;
  failureRate: number;
  windowMinutes: number;
} {
  const failureRate = failureRateWindow.requests > 0
    ? (failureRateWindow.failures / failureRateWindow.requests) * 100
    : 0;
  
  return {
    requests: failureRateWindow.requests,
    failures: failureRateWindow.failures,
    failureRate,
    windowMinutes: FAILURE_RATE_WINDOW_MS / 60000,
  };
}

// ============================================================================
// INTEGRATION WITH CIRCUIT BREAKER
// ============================================================================

/**
 * Hook to be called when circuit breaker state changes
 */
export function onCircuitBreakerStateChange(
  serviceName: string,
  newState: "closed" | "open" | "half_open",
  stats: { failures: number; lastError?: string }
): void {
  if (newState === "open") {
    // Alert when circuit opens
    alertCircuitBreakerOpen(serviceName, stats.failures, stats.lastError)
      .catch(console.error);
  }
}
