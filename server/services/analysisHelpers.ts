/**
 * Analysis Helper Functions
 * 
 * Provides utility functions for background analysis processing,
 * including partial results management and logging.
 */

import { Tier } from "../../shared/pricing";
import { TIER_ERROR_CONFIGS } from "./errorHandling";

// ============================================================================
// PARTIAL RESULTS MANAGER
// ============================================================================

export interface PartialResult {
  partNumber: number;
  content: string;
  completedAt: Date;
}

export class PartialResultsManager {
  private sessionId: string;
  private tier: Tier;
  private totalParts: number;
  private completedParts: Map<number, PartialResult> = new Map();

  constructor(sessionId: string, tier: Tier, totalParts: number) {
    this.sessionId = sessionId;
    this.tier = tier;
    this.totalParts = totalParts;
  }

  markPartComplete(partNumber: number, content: string): void {
    this.completedParts.set(partNumber, {
      partNumber,
      content,
      completedAt: new Date(),
    });
    console.log(`[PartialResults] Part ${partNumber}/${this.totalParts} complete for session ${this.sessionId}`);
  }

  getCompletedParts(): PartialResult[] {
    return Array.from(this.completedParts.values()).sort((a, b) => a.partNumber - b.partNumber);
  }

  getCompletionPercentage(): number {
    return Math.round((this.completedParts.size / this.totalParts) * 100);
  }

  getMissingParts(): number[] {
    const missing: number[] = [];
    for (let i = 1; i <= this.totalParts; i++) {
      if (!this.completedParts.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  generatePartialMarkdown(): string {
    const parts = this.getCompletedParts();
    const missing = this.getMissingParts();
    
    let markdown = "";
    
    // Add notice about partial completion
    if (missing.length > 0) {
      markdown += `
---

## ⚠️ Partial Analysis Notice

Your analysis is **${this.getCompletionPercentage()}% complete**. Some sections are being regenerated.

| Status | Sections |
|--------|----------|
| ✅ Completed | ${parts.map(p => `Part ${p.partNumber}`).join(", ") || "None"} |
| ⏳ Processing | ${missing.map(p => `Part ${p}`).join(", ")} |

---

`;
    }
    
    // Add completed parts
    for (const part of parts) {
      markdown += part.content + "\n\n";
    }
    
    // Add placeholders for missing parts
    for (const partNum of missing) {
      markdown += `
## Part ${partNum} - Processing

> ⏳ **This section is being regenerated**

We encountered a temporary issue generating this section. Our system is automatically retrying.

---

`;
    }
    
    return markdown;
  }
}

export function createPartialResultsManager(
  sessionId: string,
  tier: Tier,
  totalParts: number
): PartialResultsManager {
  return new PartialResultsManager(sessionId, tier, totalParts);
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

export function logAnalysisStart(sessionId: string, tier: Tier, problemStatement: string): void {
  console.log(`[Analysis] Starting ${tier} analysis for session ${sessionId}`);
  console.log(`[Analysis] Problem statement length: ${problemStatement.length} chars`);
}

export function logPartComplete(sessionId: string, partNumber: number, totalParts: number): void {
  console.log(`[Analysis] Part ${partNumber}/${totalParts} complete for session ${sessionId}`);
}

export function logAnalysisComplete(
  sessionId: string,
  tier: Tier,
  durationMs: number,
  success: boolean,
  completionPercentage?: number
): void {
  const status = success ? "SUCCESS" : `PARTIAL (${completionPercentage}%)`;
  console.log(`[Analysis] ${status} - Session ${sessionId} (${tier}) completed in ${durationMs}ms`);
}

export function logError(error: Error, context: { sessionId?: string; tier?: string; duration?: number }): void {
  console.error(`[Analysis Error] Session: ${context.sessionId}, Tier: ${context.tier}, Duration: ${context.duration}ms`);
  console.error(`[Analysis Error] Message: ${error.message}`);
  if (error.stack) {
    console.error(`[Analysis Error] Stack: ${error.stack}`);
  }
}

// ============================================================================
// METRICS HELPERS
// ============================================================================

interface MetricEntry {
  sessionId: string;
  tier: Tier;
  type: 'part_complete' | 'success' | 'failure' | 'retry';
  durationMs: number;
  timestamp: Date;
}

const metricsBuffer: MetricEntry[] = [];
const MAX_METRICS_BUFFER = 1000;

export function recordMetric(
  sessionId: string,
  tier: Tier,
  type: 'part_complete' | 'success' | 'failure' | 'retry',
  durationMs: number
): void {
  metricsBuffer.push({
    sessionId,
    tier,
    type,
    durationMs,
    timestamp: new Date(),
  });
  
  // Keep buffer size manageable
  if (metricsBuffer.length > MAX_METRICS_BUFFER) {
    metricsBuffer.shift();
  }
}

export function getRecentMetrics(windowMs: number = 3600000): MetricEntry[] {
  const cutoff = Date.now() - windowMs;
  return metricsBuffer.filter(m => m.timestamp.getTime() > cutoff);
}

// ============================================================================
// RETRY QUEUE (Simple in-memory implementation)
// ============================================================================

interface RetryQueueItem {
  sessionId: string;
  tier: Tier;
  problemStatement: string;
  email?: string;
  retryCount: number;
  priority: number;
  createdAt: Date;
  lastError?: string;
}

const retryQueueItems: RetryQueueItem[] = [];

export async function addToRetryQueue(item: RetryQueueItem): Promise<void> {
  retryQueueItems.push(item);
  // Sort by priority (higher first) then by creation time
  retryQueueItems.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  console.log(`[RetryQueue] Added session ${item.sessionId} to retry queue (priority: ${item.priority})`);
}

export function getRetryQueue(): RetryQueueItem[] {
  return [...retryQueueItems];
}

export function removeFromRetryQueue(sessionId: string): boolean {
  const index = retryQueueItems.findIndex(item => item.sessionId === sessionId);
  if (index !== -1) {
    retryQueueItems.splice(index, 1);
    return true;
  }
  return false;
}

// Priority levels for retry queue
export const RetryPriority = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
} as const;

// ============================================================================
// SIMPLE RETRY WRAPPER
// ============================================================================

interface WithRetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: WithRetryOptions
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Calculate exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5),
          maxDelay
        );
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
