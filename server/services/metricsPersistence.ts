/**
 * Metrics Persistence Service
 * 
 * Handles persisting analysis metrics to the database for long-term analytics,
 * aggregating hourly metrics, and providing historical data queries.
 */

import { getDb } from "../db";
import { 
  analysisMetrics, 
  hourlyMetrics,
} from "../../drizzle/schema";
import { eq, gte, lte, and, desc } from "drizzle-orm";
import { Tier } from "../../shared/pricing";

// ============================================================================
// METRIC RECORDING
// ============================================================================

export type MetricEventType = 
  | "request" 
  | "part_complete" 
  | "success" 
  | "failure" 
  | "retry" 
  | "partial_success";

export interface RecordMetricParams {
  sessionId: string;
  tier: Tier;
  eventType: MetricEventType;
  durationMs?: number;
  partNumber?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record a metric event to the database
 */
export async function recordMetricToDB(params: RecordMetricParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[MetricsPersistence] Database not available");
      return;
    }
    
    await db.insert(analysisMetrics).values({
      sessionId: params.sessionId,
      tier: params.tier,
      eventType: params.eventType,
      durationMs: params.durationMs,
      partNumber: params.partNumber,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("[MetricsPersistence] Failed to record metric:", error);
    // Don't throw - metrics should not break the main flow
  }
}

/**
 * Record analysis request start
 */
export async function recordAnalysisRequestToDB(
  sessionId: string,
  tier: Tier,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordMetricToDB({
    sessionId,
    tier,
    eventType: "request",
    metadata,
  });
}

/**
 * Record part completion
 */
export async function recordPartCompletionToDB(
  sessionId: string,
  tier: Tier,
  partNumber: number,
  durationMs: number
): Promise<void> {
  await recordMetricToDB({
    sessionId,
    tier,
    eventType: "part_complete",
    partNumber,
    durationMs,
  });
}

/**
 * Record analysis success
 */
export async function recordSuccessToDB(
  sessionId: string,
  tier: Tier,
  durationMs: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordMetricToDB({
    sessionId,
    tier,
    eventType: "success",
    durationMs,
    metadata,
  });
}

/**
 * Record analysis failure
 */
export async function recordFailureToDB(
  sessionId: string,
  tier: Tier,
  durationMs: number,
  errorCode?: string,
  errorMessage?: string
): Promise<void> {
  await recordMetricToDB({
    sessionId,
    tier,
    eventType: "failure",
    durationMs,
    errorCode,
    errorMessage,
  });
}

/**
 * Record retry attempt
 */
export async function recordRetryToDB(
  sessionId: string,
  tier: Tier,
  retryCount: number,
  errorMessage?: string
): Promise<void> {
  await recordMetricToDB({
    sessionId,
    tier,
    eventType: "retry",
    metadata: { retryCount },
    errorMessage,
  });
}

// ============================================================================
// HOURLY AGGREGATION
// ============================================================================

type MetricRow = typeof analysisMetrics.$inferSelect;
type HourlyRow = typeof hourlyMetrics.$inferSelect;

/**
 * Aggregate metrics for a specific hour and save to hourly_metrics table
 */
export async function aggregateHourlyMetrics(hourStart: Date): Promise<void> {
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
  
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[MetricsPersistence] Database not available for aggregation");
      return;
    }

    // Get all metrics for this hour
    const metrics = await db
      .select()
      .from(analysisMetrics)
      .where(
        and(
          gte(analysisMetrics.createdAt, hourStart),
          lte(analysisMetrics.createdAt, hourEnd)
        )
      );

    if (metrics.length === 0) {
      return; // No metrics for this hour
    }

    // Calculate aggregations
    const requests = metrics.filter((m: MetricRow) => m.eventType === "request");
    const successes = metrics.filter((m: MetricRow) => m.eventType === "success");
    const failures = metrics.filter((m: MetricRow) => m.eventType === "failure");
    const partialSuccesses = metrics.filter((m: MetricRow) => m.eventType === "partial_success");
    const retries = metrics.filter((m: MetricRow) => m.eventType === "retry");

    // Calculate duration statistics from success events
    const durations: number[] = successes
      .filter((m: MetricRow) => m.durationMs !== null)
      .map((m: MetricRow) => m.durationMs!)
      .sort((a: number, b: number) => a - b);

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : null;

    const p50Duration = durations.length > 0
      ? durations[Math.floor(durations.length * 0.5)]
      : null;

    const p95Duration = durations.length > 0
      ? durations[Math.floor(durations.length * 0.95)]
      : null;

    const p99Duration = durations.length > 0
      ? durations[Math.floor(durations.length * 0.99)]
      : null;

    // Count by tier
    const tierStandard = requests.filter((m: MetricRow) => m.tier === "standard").length;
    const tierMedium = requests.filter((m: MetricRow) => m.tier === "medium").length;
    const tierFull = requests.filter((m: MetricRow) => m.tier === "full").length;

    // Insert hourly metrics
    await db.insert(hourlyMetrics).values({
      hourStart,
      totalRequests: requests.length,
      successfulRequests: successes.length,
      failedRequests: failures.length,
      partialSuccesses: partialSuccesses.length,
      retriedRequests: retries.length,
      avgDurationMs: avgDuration,
      p50DurationMs: p50Duration,
      p95DurationMs: p95Duration,
      p99DurationMs: p99Duration,
      tierStandard,
      tierMedium,
      tierFull,
    });

    console.log(`[MetricsPersistence] Aggregated hourly metrics for ${hourStart.toISOString()}`);
  } catch (error) {
    console.error("[MetricsPersistence] Failed to aggregate hourly metrics:", error);
  }
}

/**
 * Run hourly aggregation for the previous hour
 * Should be called by a scheduled job
 */
export async function runHourlyAggregation(): Promise<void> {
  const now = new Date();
  const previousHour = new Date(now);
  previousHour.setMinutes(0, 0, 0);
  previousHour.setHours(previousHour.getHours() - 1);
  
  await aggregateHourlyMetrics(previousHour);
}

// ============================================================================
// HISTORICAL DATA QUERIES
// ============================================================================

export interface MetricsTimeRange {
  start: Date;
  end: Date;
}

export interface HistoricalMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  partialSuccesses: number;
  retriedRequests: number;
  successRate: number;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  byTier: {
    standard: number;
    medium: number;
    full: number;
  };
  hourlyData: Array<{
    hour: Date;
    requests: number;
    successes: number;
    failures: number;
    avgDuration: number | null;
  }>;
}

type TotalsAcc = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  partialSuccesses: number;
  retriedRequests: number;
  tierStandard: number;
  tierMedium: number;
  tierFull: number;
};

/**
 * Get historical metrics for a time range
 */
export async function getHistoricalMetrics(range: MetricsTimeRange): Promise<HistoricalMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      partialSuccesses: 0,
      retriedRequests: 0,
      successRate: 100,
      avgDurationMs: null,
      p95DurationMs: null,
      byTier: { standard: 0, medium: 0, full: 0 },
      hourlyData: [],
    };
  }

  // Get hourly aggregated data
  const hourlyData = await db
    .select()
    .from(hourlyMetrics)
    .where(
      and(
        gte(hourlyMetrics.hourStart, range.start),
        lte(hourlyMetrics.hourStart, range.end)
      )
    )
    .orderBy(hourlyMetrics.hourStart);

  // Calculate totals
  const totals = hourlyData.reduce(
    (acc: TotalsAcc, h: HourlyRow) => ({
      totalRequests: acc.totalRequests + h.totalRequests,
      successfulRequests: acc.successfulRequests + h.successfulRequests,
      failedRequests: acc.failedRequests + h.failedRequests,
      partialSuccesses: acc.partialSuccesses + h.partialSuccesses,
      retriedRequests: acc.retriedRequests + h.retriedRequests,
      tierStandard: acc.tierStandard + h.tierStandard,
      tierMedium: acc.tierMedium + h.tierMedium,
      tierFull: acc.tierFull + h.tierFull,
    }),
    {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      partialSuccesses: 0,
      retriedRequests: 0,
      tierStandard: 0,
      tierMedium: 0,
      tierFull: 0,
    }
  );

  // Calculate average duration
  const durationsWithData = hourlyData.filter((h: HourlyRow) => h.avgDurationMs !== null);
  const avgDuration = durationsWithData.length > 0
    ? Math.round(
        durationsWithData.reduce((a: number, h: HourlyRow) => a + (h.avgDurationMs || 0), 0) / durationsWithData.length
      )
    : null;

  // Get p95 from the hourly data
  const p95Values = hourlyData
    .filter((h: HourlyRow) => h.p95DurationMs !== null)
    .map((h: HourlyRow) => h.p95DurationMs!);
  const p95Duration = p95Values.length > 0
    ? p95Values[Math.floor(p95Values.length * 0.95)]
    : null;

  const successRate = totals.totalRequests > 0
    ? (totals.successfulRequests / totals.totalRequests) * 100
    : 100;

  return {
    totalRequests: totals.totalRequests,
    successfulRequests: totals.successfulRequests,
    failedRequests: totals.failedRequests,
    partialSuccesses: totals.partialSuccesses,
    retriedRequests: totals.retriedRequests,
    successRate,
    avgDurationMs: avgDuration,
    p95DurationMs: p95Duration,
    byTier: {
      standard: totals.tierStandard,
      medium: totals.tierMedium,
      full: totals.tierFull,
    },
    hourlyData: hourlyData.map((h: HourlyRow) => ({
      hour: h.hourStart,
      requests: h.totalRequests,
      successes: h.successfulRequests,
      failures: h.failedRequests,
      avgDuration: h.avgDurationMs,
    })),
  };
}

/**
 * Get metrics for the last N hours
 */
export async function getRecentHistoricalMetrics(hours: number = 24): Promise<HistoricalMetrics> {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return getHistoricalMetrics({ start, end });
}

/**
 * Get recent raw metrics (for real-time dashboard)
 */
export async function getRecentRawMetrics(minutes: number = 60): Promise<MetricRow[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  
  return db
    .select()
    .from(analysisMetrics)
    .where(gte(analysisMetrics.createdAt, cutoff))
    .orderBy(desc(analysisMetrics.createdAt))
    .limit(1000);
}

/**
 * Get error summary for a time range
 */
export async function getErrorSummary(range: MetricsTimeRange): Promise<Array<{
  errorCode: string;
  count: number;
  lastOccurrence: Date;
}>> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  const errors = await db
    .select()
    .from(analysisMetrics)
    .where(
      and(
        eq(analysisMetrics.eventType, "failure"),
        gte(analysisMetrics.createdAt, range.start),
        lte(analysisMetrics.createdAt, range.end)
      )
    )
    .orderBy(desc(analysisMetrics.createdAt));

  // Group by error code
  const errorMap = new Map<string, { count: number; lastOccurrence: Date }>();
  
  for (const error of errors) {
    const code = error.errorCode || "UNKNOWN";
    const existing = errorMap.get(code);
    
    if (existing) {
      existing.count++;
    } else {
      errorMap.set(code, {
        count: 1,
        lastOccurrence: error.createdAt,
      });
    }
  }

  return Array.from(errorMap.entries())
    .map(([errorCode, data]) => ({
      errorCode,
      count: data.count,
      lastOccurrence: data.lastOccurrence,
    }))
    .sort((a, b) => b.count - a.count);
}
