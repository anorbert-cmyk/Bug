/**
 * Analysis State Machine Service
 * 
 * Implements a robust state machine for tracking multi-part analysis operations.
 * Follows industry best practices:
 * - Event Sourcing: All state changes are recorded as immutable events
 * - State Machine Pattern: Well-defined states and valid transitions
 * - Audit Trail: Complete history for debugging and compliance
 * - Idempotency: Safe to retry operations
 * 
 * @author System Architect
 * @version 1.0.0
 */

import { getDb } from "../db";
import { 
  analysisOperations, 
  analysisOperationEvents,
  adminAuditLog,
  analysisSessions,
  analysisResults
} from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { Tier } from "../../shared/pricing";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type OperationState = 
  | "initialized"
  | "generating"
  | "part_completed"
  | "paused"
  | "failed"
  | "completed"
  | "cancelled";

export type EventType =
  | "operation_started"
  | "part_started"
  | "part_completed"
  | "part_failed"
  | "operation_completed"
  | "operation_failed"
  | "operation_paused"
  | "operation_resumed"
  | "operation_cancelled"
  | "operation_retried"
  | "admin_intervention";

export type ActorType = "system" | "admin" | "user";
export type TriggerSource = "user" | "system" | "admin" | "retry_queue";

export interface OperationContext {
  sessionId: string;
  tier: Tier;
  operationId?: string;
  triggeredBy?: TriggerSource;
}

export interface StateTransitionResult {
  success: boolean;
  operationId: string;
  previousState: OperationState;
  newState: OperationState;
  error?: string;
}

export interface PartCompletionData {
  partNumber: number;
  content: string;
  durationMs: number;
  tokenCount?: number;
}

export interface OperationDetails {
  operation: typeof analysisOperations.$inferSelect;
  events: Array<typeof analysisOperationEvents.$inferSelect>;
  partialResults: {
    part1?: string;
    part2?: string;
    part3?: string;
    part4?: string;
    part5?: string;
    part6?: string;
  };
}

// ============================================================================
// STATE MACHINE CONFIGURATION
// ============================================================================

/**
 * Valid state transitions matrix
 * Key: current state, Value: array of valid next states
 */
const VALID_TRANSITIONS: Record<OperationState, OperationState[]> = {
  initialized: ["generating", "cancelled"],
  generating: ["part_completed", "failed", "paused", "cancelled"],
  part_completed: ["generating", "completed", "paused", "cancelled"],
  paused: ["generating", "cancelled"],
  failed: ["generating", "cancelled"], // Can retry from failed
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * Tier to total parts mapping
 */
const TIER_PARTS: Record<Tier, number> = {
  standard: 1,  // Observer
  medium: 2,    // Insider
  full: 6,      // Syndicate
};

/**
 * Estimated duration per part in milliseconds (for progress estimation)
 */
const ESTIMATED_PART_DURATION_MS: Record<Tier, number> = {
  standard: 30000,  // 30 seconds
  medium: 45000,    // 45 seconds per part
  full: 60000,      // 60 seconds per part
};

// ============================================================================
// CORE STATE MACHINE FUNCTIONS
// ============================================================================

/**
 * Check if a state transition is valid
 */
function isValidTransition(from: OperationState, to: OperationState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Create a new analysis operation
 */
export async function createOperation(
  context: OperationContext
): Promise<{ operationId: string; success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { operationId: "", success: false, error: "Database not available" };
    }

    const operationId = context.operationId || uuidv4();
    const totalParts = TIER_PARTS[context.tier];
    const estimatedDuration = totalParts * ESTIMATED_PART_DURATION_MS[context.tier];
    const estimatedCompletionAt = new Date(Date.now() + estimatedDuration);

    // Create operation record
    await db.insert(analysisOperations).values({
      sessionId: context.sessionId,
      operationId,
      tier: context.tier,
      state: "initialized",
      totalParts,
      completedParts: 0,
      currentPart: 0,
      estimatedCompletionAt,
      triggeredBy: context.triggeredBy || "user",
    });

    // Record creation event
    await recordEvent({
      operationId,
      sessionId: context.sessionId,
      eventType: "operation_started",
      previousState: undefined,
      newState: "initialized",
      actorType: context.triggeredBy === "admin" ? "admin" : "system",
      metadata: { tier: context.tier, totalParts },
    });

    console.log(`[StateMachine] Created operation ${operationId} for session ${context.sessionId}`);
    return { operationId, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[StateMachine] Failed to create operation:", errorMessage);
    return { operationId: "", success: false, error: errorMessage };
  }
}

/**
 * Transition operation to a new state
 */
export async function transitionState(
  operationId: string,
  newState: OperationState,
  options?: {
    actorType?: ActorType;
    actorId?: string;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<StateTransitionResult> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        operationId,
        previousState: "initialized",
        newState,
        error: "Database not available",
      };
    }

    // Get current operation
    const operations = await db
      .select()
      .from(analysisOperations)
      .where(eq(analysisOperations.operationId, operationId))
      .limit(1);

    if (operations.length === 0) {
      return {
        success: false,
        operationId,
        previousState: "initialized",
        newState,
        error: "Operation not found",
      };
    }

    const operation = operations[0];
    const previousState = operation.state as OperationState;

    // Validate transition
    if (!isValidTransition(previousState, newState)) {
      console.warn(
        `[StateMachine] Invalid transition: ${previousState} -> ${newState} for operation ${operationId}`
      );
      return {
        success: false,
        operationId,
        previousState,
        newState,
        error: `Invalid state transition from ${previousState} to ${newState}`,
      };
    }

    // Prepare update data
    const updateData: Partial<typeof analysisOperations.$inferInsert> = {
      state: newState,
    };

    // Handle state-specific updates
    if (newState === "generating" && previousState === "initialized") {
      updateData.startedAt = new Date();
      updateData.currentPart = 1;
    } else if (newState === "failed") {
      updateData.lastError = options?.errorMessage;
      updateData.lastErrorAt = new Date();
      updateData.failedPart = operation.currentPart;
    } else if (newState === "completed") {
      updateData.completedAt = new Date();
    }

    // Update operation
    await db
      .update(analysisOperations)
      .set(updateData)
      .where(eq(analysisOperations.operationId, operationId));

    // Record event
    await recordEvent({
      operationId,
      sessionId: operation.sessionId,
      eventType: getEventTypeForTransition(previousState, newState),
      previousState,
      newState,
      actorType: options?.actorType || "system",
      actorId: options?.actorId,
      errorCode: options?.errorCode,
      errorMessage: options?.errorMessage,
      metadata: options?.metadata,
    });

    console.log(`[StateMachine] Transitioned ${operationId}: ${previousState} -> ${newState}`);
    return { success: true, operationId, previousState, newState };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[StateMachine] Transition failed:", errorMessage);
    return {
      success: false,
      operationId,
      previousState: "initialized",
      newState,
      error: errorMessage,
    };
  }
}

/**
 * Record part completion
 */
export async function recordPartCompletion(
  operationId: string,
  data: PartCompletionData
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Get current operation
    const operations = await db
      .select()
      .from(analysisOperations)
      .where(eq(analysisOperations.operationId, operationId))
      .limit(1);

    if (operations.length === 0) return false;

    const operation = operations[0];
    const newCompletedParts = operation.completedParts + 1;
    const isLastPart = newCompletedParts >= operation.totalParts;

    // Update operation
    await db
      .update(analysisOperations)
      .set({
        completedParts: newCompletedParts,
        currentPart: isLastPart ? operation.totalParts : data.partNumber + 1,
        lastPartCompletedAt: new Date(),
        state: isLastPart ? "completed" : "part_completed",
        completedAt: isLastPart ? new Date() : undefined,
      })
      .where(eq(analysisOperations.operationId, operationId));

    // Record event
    await recordEvent({
      operationId,
      sessionId: operation.sessionId,
      eventType: isLastPart ? "operation_completed" : "part_completed",
      partNumber: data.partNumber,
      previousState: operation.state,
      newState: isLastPart ? "completed" : "part_completed",
      durationMs: data.durationMs,
      tokenCount: data.tokenCount,
      actorType: "system",
    });

    console.log(
      `[StateMachine] Part ${data.partNumber}/${operation.totalParts} completed for ${operationId}`
    );
    return true;
  } catch (error) {
    console.error("[StateMachine] Failed to record part completion:", error);
    return false;
  }
}

/**
 * Record part failure
 */
export async function recordPartFailure(
  operationId: string,
  partNumber: number,
  errorCode: string,
  errorMessage: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    const operations = await db
      .select()
      .from(analysisOperations)
      .where(eq(analysisOperations.operationId, operationId))
      .limit(1);

    if (operations.length === 0) return false;

    const operation = operations[0];

    // Update operation
    await db
      .update(analysisOperations)
      .set({
        state: "failed",
        lastError: errorMessage,
        lastErrorAt: new Date(),
        failedPart: partNumber,
      })
      .where(eq(analysisOperations.operationId, operationId));

    // Record event
    await recordEvent({
      operationId,
      sessionId: operation.sessionId,
      eventType: "part_failed",
      partNumber,
      previousState: operation.state,
      newState: "failed",
      errorCode,
      errorMessage,
      actorType: "system",
    });

    console.log(`[StateMachine] Part ${partNumber} failed for ${operationId}: ${errorCode}`);
    return true;
  } catch (error) {
    console.error("[StateMachine] Failed to record part failure:", error);
    return false;
  }
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get operation details with events and partial results
 */
export async function getOperationDetails(
  operationId: string
): Promise<OperationDetails | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    // Get operation
    const operations = await db
      .select()
      .from(analysisOperations)
      .where(eq(analysisOperations.operationId, operationId))
      .limit(1);

    if (operations.length === 0) return null;

    const operation = operations[0];

    // Get events
    const events = await db
      .select()
      .from(analysisOperationEvents)
      .where(eq(analysisOperationEvents.operationId, operationId))
      .orderBy(desc(analysisOperationEvents.createdAt));

    // Get partial results from analysis_results
    const results = await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.sessionId, operation.sessionId))
      .limit(1);

    const partialResults: OperationDetails["partialResults"] = {};
    if (results.length > 0) {
      const result = results[0];
      if (result.part1) partialResults.part1 = result.part1;
      if (result.part2) partialResults.part2 = result.part2;
      if (result.part3) partialResults.part3 = result.part3;
      if (result.part4) partialResults.part4 = result.part4;
      if (result.part5) partialResults.part5 = result.part5;
      if (result.part6) partialResults.part6 = result.part6;
    }

    return { operation, events, partialResults };
  } catch (error) {
    console.error("[StateMachine] Failed to get operation details:", error);
    return null;
  }
}

/**
 * Get operation by session ID
 */
export async function getOperationBySessionId(
  sessionId: string
): Promise<typeof analysisOperations.$inferSelect | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const operations = await db
      .select()
      .from(analysisOperations)
      .where(eq(analysisOperations.sessionId, sessionId))
      .orderBy(desc(analysisOperations.createdAt))
      .limit(1);

    return operations[0] || null;
  } catch (error) {
    console.error("[StateMachine] Failed to get operation by session:", error);
    return null;
  }
}

/**
 * Get all operations with optional filtering
 */
export async function getOperations(options?: {
  state?: OperationState;
  tier?: Tier;
  limit?: number;
  offset?: number;
}): Promise<Array<typeof analysisOperations.$inferSelect>> {
  try {
    const db = await getDb();
    if (!db) return [];

    let query = db.select().from(analysisOperations);

    // Apply filters
    const conditions = [];
    if (options?.state) {
      conditions.push(eq(analysisOperations.state, options.state));
    }
    if (options?.tier) {
      conditions.push(eq(analysisOperations.tier, options.tier));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order by most recent first
    query = query.orderBy(desc(analysisOperations.createdAt)) as typeof query;

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as typeof query;
    }

    return await query;
  } catch (error) {
    console.error("[StateMachine] Failed to get operations:", error);
    return [];
  }
}

/**
 * Get failed operations that can be retried
 */
export async function getRetryableOperations(): Promise<
  Array<typeof analysisOperations.$inferSelect>
> {
  try {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(analysisOperations)
      .where(eq(analysisOperations.state, "failed"))
      .orderBy(desc(analysisOperations.createdAt));
  } catch (error) {
    console.error("[StateMachine] Failed to get retryable operations:", error);
    return [];
  }
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

/**
 * Pause an operation (admin action)
 */
export async function pauseOperation(
  operationId: string,
  adminWallet: string,
  reason?: string
): Promise<StateTransitionResult> {
  const result = await transitionState(operationId, "paused", {
    actorType: "admin",
    actorId: adminWallet,
    metadata: { reason },
  });

  if (result.success) {
    await logAdminAction(adminWallet, "pause_operation", "operation", operationId, {
      reason,
    });
  }

  return result;
}

/**
 * Resume a paused operation (admin action)
 */
export async function resumeOperation(
  operationId: string,
  adminWallet: string
): Promise<StateTransitionResult> {
  const result = await transitionState(operationId, "generating", {
    actorType: "admin",
    actorId: adminWallet,
  });

  if (result.success) {
    await logAdminAction(adminWallet, "resume_operation", "operation", operationId);
  }

  return result;
}

/**
 * Cancel an operation (admin action)
 */
export async function cancelOperation(
  operationId: string,
  adminWallet: string,
  reason?: string
): Promise<StateTransitionResult> {
  const result = await transitionState(operationId, "cancelled", {
    actorType: "admin",
    actorId: adminWallet,
    metadata: { reason },
  });

  if (result.success) {
    await logAdminAction(adminWallet, "cancel_operation", "operation", operationId, {
      reason,
    });
  }

  return result;
}

/**
 * Trigger regeneration of a failed operation (admin action)
 */
export async function triggerRegeneration(
  sessionId: string,
  adminWallet: string,
  options?: {
    fromPart?: number; // Start from specific part (for partial regeneration)
  }
): Promise<{ success: boolean; newOperationId?: string; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Get session info
    const sessions = await db
      .select()
      .from(analysisSessions)
      .where(eq(analysisSessions.sessionId, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      return { success: false, error: "Session not found" };
    }

    const session = sessions[0];

    // Create new operation
    const { operationId, success, error } = await createOperation({
      sessionId,
      tier: session.tier as Tier,
      triggeredBy: "admin",
    });

    if (!success) {
      return { success: false, error };
    }

    // Log admin action
    await logAdminAction(adminWallet, "trigger_regeneration", "analysis", sessionId, {
      newOperationId: operationId,
      fromPart: options?.fromPart,
    });

    // Update session status
    await db
      .update(analysisSessions)
      .set({ status: "processing" })
      .where(eq(analysisSessions.sessionId, sessionId));

    console.log(
      `[StateMachine] Admin ${adminWallet} triggered regeneration for session ${sessionId}`
    );
    return { success: true, newOperationId: operationId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[StateMachine] Failed to trigger regeneration:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Record an event to the event log
 */
async function recordEvent(params: {
  operationId: string;
  sessionId: string;
  eventType: EventType;
  partNumber?: number;
  previousState?: string;
  newState?: string;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  tokenCount?: number;
  actorType?: ActorType;
  actorId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(analysisOperationEvents).values({
      operationId: params.operationId,
      sessionId: params.sessionId,
      eventType: params.eventType,
      partNumber: params.partNumber,
      previousState: params.previousState,
      newState: params.newState,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      durationMs: params.durationMs,
      tokenCount: params.tokenCount,
      actorType: params.actorType || "system",
      actorId: params.actorId,
      metadata: params.metadata,
    });
  } catch (error) {
    console.error("[StateMachine] Failed to record event:", error);
  }
}

/**
 * Log admin action to audit log
 */
async function logAdminAction(
  adminWallet: string,
  action: typeof adminAuditLog.$inferInsert["action"],
  targetType: typeof adminAuditLog.$inferInsert["targetType"],
  targetId: string,
  requestDetails?: Record<string, unknown>
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(adminAuditLog).values({
      adminWallet,
      action,
      targetType,
      targetId,
      requestDetails,
      success: true,
    });
  } catch (error) {
    console.error("[StateMachine] Failed to log admin action:", error);
  }
}

/**
 * Map state transition to event type
 */
function getEventTypeForTransition(
  from: OperationState,
  to: OperationState
): EventType {
  if (to === "generating" && from === "initialized") return "operation_started";
  if (to === "generating" && from === "paused") return "operation_resumed";
  if (to === "generating" && from === "failed") return "operation_retried";
  if (to === "paused") return "operation_paused";
  if (to === "cancelled") return "operation_cancelled";
  if (to === "failed") return "operation_failed";
  if (to === "completed") return "operation_completed";
  return "admin_intervention";
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TIER_PARTS,
  ESTIMATED_PART_DURATION_MS,
  isValidTransition,
};
