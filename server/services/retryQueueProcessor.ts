/**
 * Retry Queue Background Processor
 * 
 * Processes failed analyses from the retry queue with automatic retry logic:
 * - Picks up pending items from the queue
 * - Retries with exponential backoff
 * - Updates status and notifies on completion/failure
 */

import { getDb } from "../db";
import { retryQueue, analysisSessions, analysisResults } from "../../drizzle/schema";
import { eq, lte, and, asc, isNull, or } from "drizzle-orm";
import { Tier } from "../../shared/pricing";
import { alertCriticalError, alertSystemIssue } from "./adminAlerts";
import { recordMetricToDB } from "./metricsPersistence";

// ============================================================================
// TYPES
// ============================================================================

export type QueueStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface RetryQueueItem {
  id: number;
  sessionId: string;
  tier: Tier;
  problemStatement: string;
  email: string | null;
  retryCount: number;
  maxRetries: number;
  priority: number;
  lastError: string | null;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  status: QueueStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddToQueueParams {
  sessionId: string;
  tier: Tier;
  problemStatement: string;
  email?: string;
  priority?: number;
  maxRetries?: number;
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Add a failed analysis to the retry queue
 */
export async function addToRetryQueueDB(params: AddToQueueParams): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[RetryQueue] Database not available");
      return false;
    }

    // Calculate next retry time (immediate for first retry)
    const nextRetryAt = new Date();

    await db.insert(retryQueue).values({
      sessionId: params.sessionId,
      tier: params.tier,
      problemStatement: params.problemStatement,
      email: params.email,
      priority: params.priority ?? 2, // Default to MEDIUM priority
      maxRetries: params.maxRetries ?? 5,
      nextRetryAt,
      status: "pending",
    });

    console.log(`[RetryQueue] Added session ${params.sessionId} to retry queue`);
    return true;
  } catch (error) {
    console.error("[RetryQueue] Failed to add to queue:", error);
    return false;
  }
}

/**
 * Get the next item to process from the queue
 */
export async function getNextQueueItem(): Promise<RetryQueueItem | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const now = new Date();
    
    // Get oldest pending item that's ready for retry
    const items = await db
      .select()
      .from(retryQueue)
      .where(
        and(
          eq(retryQueue.status, "pending"),
          or(
            isNull(retryQueue.nextRetryAt),
            lte(retryQueue.nextRetryAt, now)
          )
        )
      )
      .orderBy(asc(retryQueue.priority), asc(retryQueue.createdAt))
      .limit(1);

    if (items.length === 0) return null;

    const item = items[0];
    
    // Mark as processing
    await db
      .update(retryQueue)
      .set({ 
        status: "processing",
        lastAttemptAt: now,
      })
      .where(eq(retryQueue.id, item.id));

    return item as RetryQueueItem;
  } catch (error) {
    console.error("[RetryQueue] Failed to get next item:", error);
    return null;
  }
}

/**
 * Mark a queue item as completed
 */
export async function markQueueItemCompleted(sessionId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db
      .update(retryQueue)
      .set({ status: "completed" })
      .where(eq(retryQueue.sessionId, sessionId));

    console.log(`[RetryQueue] Marked session ${sessionId} as completed`);
  } catch (error) {
    console.error("[RetryQueue] Failed to mark completed:", error);
  }
}

/**
 * Mark a queue item for retry with exponential backoff
 */
export async function markQueueItemForRetry(
  sessionId: string,
  error: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Get current item
    const items = await db
      .select()
      .from(retryQueue)
      .where(eq(retryQueue.sessionId, sessionId))
      .limit(1);

    if (items.length === 0) return false;

    const item = items[0];
    const newRetryCount = item.retryCount + 1;

    // Check if max retries exceeded
    if (newRetryCount >= item.maxRetries) {
      await db
        .update(retryQueue)
        .set({
          status: "failed",
          retryCount: newRetryCount,
          lastError: error.substring(0, 1000),
        })
        .where(eq(retryQueue.id, item.id));

      // Alert admin about permanent failure
      await alertCriticalError(
        "Retry Queue Exhausted",
        `Session ${sessionId} has failed after ${newRetryCount} retry attempts. Manual intervention required.`,
        { sessionId, tier: item.tier, lastError: error.substring(0, 500) }
      );

      console.log(`[RetryQueue] Session ${sessionId} permanently failed after ${newRetryCount} retries`);
      return false;
    }

    // Calculate next retry time with exponential backoff
    // Base delay: 1 minute, max delay: 30 minutes
    const baseDelay = 60 * 1000; // 1 minute
    const maxDelay = 30 * 60 * 1000; // 30 minutes
    const delay = Math.min(baseDelay * Math.pow(2, newRetryCount - 1), maxDelay);
    const nextRetryAt = new Date(Date.now() + delay);

    await db
      .update(retryQueue)
      .set({
        status: "pending",
        retryCount: newRetryCount,
        lastError: error.substring(0, 1000),
        nextRetryAt,
      })
      .where(eq(retryQueue.id, item.id));

    console.log(`[RetryQueue] Session ${sessionId} scheduled for retry ${newRetryCount}/${item.maxRetries} at ${nextRetryAt.toISOString()}`);
    return true;
  } catch (err) {
    console.error("[RetryQueue] Failed to mark for retry:", err);
    return false;
  }
}

/**
 * Cancel a queue item
 */
export async function cancelQueueItem(sessionId: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db
      .update(retryQueue)
      .set({ status: "cancelled" })
      .where(eq(retryQueue.sessionId, sessionId));

    console.log(`[RetryQueue] Cancelled session ${sessionId}`);
  } catch (error) {
    console.error("[RetryQueue] Failed to cancel:", error);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, total: 0 };
    }

    const items = await db.select().from(retryQueue);
    
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: items.length,
    };

    for (const item of items) {
      const status = item.status as QueueStatus;
      if (status in stats) {
        stats[status]++;
      }
    }

    return stats;
  } catch (error) {
    console.error("[RetryQueue] Failed to get stats:", error);
    return { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, total: 0 };
  }
}

// ============================================================================
// BACKGROUND PROCESSOR
// ============================================================================

let processorRunning = false;
let processorInterval: NodeJS.Timeout | null = null;
const PROCESSOR_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

/**
 * Process a single queue item
 */
async function processQueueItem(item: RetryQueueItem): Promise<void> {
  console.log(`[RetryQueue] Processing session ${item.sessionId} (attempt ${item.retryCount + 1}/${item.maxRetries})`);

  try {
    // Record retry metric
    await recordMetricToDB({
      sessionId: item.sessionId,
      tier: item.tier,
      eventType: "retry",
      metadata: { retryCount: item.retryCount + 1 },
    });

    // Import analysis function dynamically to avoid circular dependencies
    const { generateAnalysisForSession } = await import("./analysisProcessor");
    
    // Attempt to generate analysis
    const success = await generateAnalysisForSession(item.sessionId, item.tier, item.problemStatement);

    if (success) {
      await markQueueItemCompleted(item.sessionId);
      
      // Update session status
      const db = await getDb();
      if (db) {
        await db
          .update(analysisSessions)
          .set({ status: "completed" })
          .where(eq(analysisSessions.sessionId, item.sessionId));
      }

      console.log(`[RetryQueue] Successfully processed session ${item.sessionId}`);
    } else {
      await markQueueItemForRetry(item.sessionId, "Analysis generation returned false");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[RetryQueue] Error processing session ${item.sessionId}:`, errorMessage);
    await markQueueItemForRetry(item.sessionId, errorMessage);
  }
}

/**
 * Run one iteration of the processor
 */
async function runProcessorIteration(): Promise<void> {
  if (!processorRunning) return;

  try {
    const item = await getNextQueueItem();
    
    if (item) {
      await processQueueItem(item);
    }
  } catch (error) {
    console.error("[RetryQueue] Processor iteration error:", error);
  }
}

/**
 * Start the background processor
 */
export function startRetryQueueProcessor(): void {
  if (processorRunning) {
    console.log("[RetryQueue] Processor already running");
    return;
  }

  processorRunning = true;
  console.log("[RetryQueue] Starting background processor");

  // Run immediately once
  runProcessorIteration().catch(console.error);

  // Then run on interval
  processorInterval = setInterval(() => {
    runProcessorIteration().catch(console.error);
  }, PROCESSOR_INTERVAL_MS);
}

/**
 * Stop the background processor
 */
export function stopRetryQueueProcessor(): void {
  if (!processorRunning) return;

  processorRunning = false;
  
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }

  console.log("[RetryQueue] Stopped background processor");
}

/**
 * Check if processor is running
 */
export function isProcessorRunning(): boolean {
  return processorRunning;
}

// ============================================================================
// ANALYSIS PROCESSOR STUB
// ============================================================================

// This will be implemented in a separate file to avoid circular dependencies
// For now, create a placeholder that the actual implementation will override
