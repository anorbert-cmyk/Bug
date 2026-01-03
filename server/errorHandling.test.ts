/**
 * Error Handling Integration Tests
 * 
 * Tests for the error handling system including:
 * - Error classification
 * - Circuit breaker functionality
 * - Admin dashboard endpoints
 * - Analysis helpers
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AnalysisError,
  classifyError,
  ErrorCategory,
  ErrorSeverity,
  TIER_ERROR_CONFIGS,
} from "./services/errorHandling";
import {
  createPartialResultsManager,
  logAnalysisStart,
  logPartComplete,
  logAnalysisComplete,
  logError,
  recordMetric,
  addToRetryQueue,
  getRetryQueue,
  removeFromRetryQueue,
  RetryPriority,
  withRetry,
  getRecentMetrics,
} from "./services/analysisHelpers";
import {
  perplexityCircuitBreaker,
  CircuitState,
} from "./services/retryStrategy";
import {
  getDashboardData,
  getHealthStatus,
  getMetrics,
} from "./services/errorMonitoring";

describe("Error Classification", () => {
  it("should classify network errors as recoverable", () => {
    const networkError = new Error("ECONNREFUSED");
    const classified = classifyError(networkError, { sessionId: "test-123" });
    
    expect(classified).toBeInstanceOf(AnalysisError);
    expect(classified.isRetryable).toBe(true);
  });

  it("should classify timeout errors as recoverable", () => {
    const timeoutError = new Error("Request timeout after 30000ms");
    const classified = classifyError(timeoutError, { sessionId: "test-123" });
    
    expect(classified).toBeInstanceOf(AnalysisError);
    expect(classified.isRetryable).toBe(true);
  });

  it("should classify rate limit errors as recoverable", () => {
    const rateLimitError = new Error("Rate limit exceeded");
    const classified = classifyError(rateLimitError, { sessionId: "test-123" });
    
    expect(classified).toBeInstanceOf(AnalysisError);
    expect(classified.isRetryable).toBe(true);
  });

  it("should preserve context in classified errors", () => {
    const error = new Error("Test error");
    const context = { sessionId: "test-123", tier: "full" as const };
    const classified = classifyError(error, context);
    
    expect(classified.context.sessionId).toBe("test-123");
    expect(classified.context.tier).toBe("full");
  });
});

describe("Tier Error Configurations", () => {
  it("should have correct config for standard tier", () => {
    const config = TIER_ERROR_CONFIGS.standard;
    
    expect(config.maxRetries).toBe(2);
    expect(config.expectedParts).toBe(1);
    expect(config.minPartsForPartialSuccess).toBe(1);
  });

  it("should have correct config for medium tier", () => {
    const config = TIER_ERROR_CONFIGS.medium;
    
    expect(config.maxRetries).toBe(3);
    expect(config.expectedParts).toBe(2);
    expect(config.minPartsForPartialSuccess).toBe(1);
  });

  it("should have correct config for full tier", () => {
    const config = TIER_ERROR_CONFIGS.full;
    
    expect(config.maxRetries).toBe(5);
    expect(config.expectedParts).toBe(6);
    expect(config.minPartsForPartialSuccess).toBe(4);
  });
});

describe("Partial Results Manager", () => {
  it("should track completed parts", () => {
    const manager = createPartialResultsManager("test-session", "full", 6);
    
    manager.markPartComplete(1, "Part 1 content");
    manager.markPartComplete(2, "Part 2 content");
    
    expect(manager.getCompletedParts()).toHaveLength(2);
    expect(manager.getCompletionPercentage()).toBe(33); // 2/6 = 33%
  });

  it("should identify missing parts", () => {
    const manager = createPartialResultsManager("test-session", "full", 6);
    
    manager.markPartComplete(1, "Part 1 content");
    manager.markPartComplete(3, "Part 3 content");
    
    const missing = manager.getMissingParts();
    expect(missing).toContain(2);
    expect(missing).toContain(4);
    expect(missing).toContain(5);
    expect(missing).toContain(6);
    expect(missing).not.toContain(1);
    expect(missing).not.toContain(3);
  });

  it("should generate partial markdown with completed parts", () => {
    const manager = createPartialResultsManager("test-session", "medium", 2);
    
    manager.markPartComplete(1, "# Part 1\n\nContent here");
    
    const markdown = manager.generatePartialMarkdown();
    
    expect(markdown).toContain("Part 1");
    expect(markdown).toContain("50%");
    expect(markdown).toContain("Processing");
  });
});

describe("Retry Queue", () => {
  beforeEach(() => {
    // Clear retry queue before each test
    const queue = getRetryQueue();
    queue.forEach(item => removeFromRetryQueue(item.sessionId));
  });

  it("should add items to retry queue", async () => {
    await addToRetryQueue({
      sessionId: "test-session-1",
      tier: "full",
      problemStatement: "Test problem",
      retryCount: 0,
      priority: RetryPriority.HIGH,
      createdAt: new Date(),
    });
    
    const queue = getRetryQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].sessionId).toBe("test-session-1");
  });

  it("should sort queue by priority", async () => {
    await addToRetryQueue({
      sessionId: "low-priority",
      tier: "standard",
      problemStatement: "Test",
      retryCount: 0,
      priority: RetryPriority.LOW,
      createdAt: new Date(),
    });
    
    await addToRetryQueue({
      sessionId: "high-priority",
      tier: "full",
      problemStatement: "Test",
      retryCount: 0,
      priority: RetryPriority.HIGH,
      createdAt: new Date(),
    });
    
    const queue = getRetryQueue();
    expect(queue[0].sessionId).toBe("high-priority");
    expect(queue[1].sessionId).toBe("low-priority");
  });

  it("should remove items from retry queue", async () => {
    await addToRetryQueue({
      sessionId: "to-remove",
      tier: "standard",
      problemStatement: "Test",
      retryCount: 0,
      priority: RetryPriority.MEDIUM,
      createdAt: new Date(),
    });
    
    const removed = removeFromRetryQueue("to-remove");
    expect(removed).toBe(true);
    
    const queue = getRetryQueue();
    expect(queue.find(item => item.sessionId === "to-remove")).toBeUndefined();
  });
});

describe("withRetry Function", () => {
  it("should succeed on first attempt", async () => {
    const operation = vi.fn().mockResolvedValue("success");
    
    const result = await withRetry(operation, {
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 1000,
    });
    
    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("First failure"))
      .mockRejectedValueOnce(new Error("Second failure"))
      .mockResolvedValue("success");
    
    const result = await withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10, // Short delay for tests
      maxDelay: 100,
    });
    
    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("should throw after max retries exceeded", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Always fails"));
    
    await expect(
      withRetry(operation, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100,
      })
    ).rejects.toThrow("Always fails");
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should call onRetry callback", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("Failure"))
      .mockResolvedValue("success");
    
    const onRetry = vi.fn();
    
    await withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10,
      maxDelay: 100,
      onRetry,
    });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });
});

describe("Metrics Recording", () => {
  it("should record metrics", () => {
    recordMetric("test-session", "full", "success", 5000);
    
    const metrics = getRecentMetrics(60000);
    const lastMetric = metrics[metrics.length - 1];
    
    expect(lastMetric.sessionId).toBe("test-session");
    expect(lastMetric.tier).toBe("full");
    expect(lastMetric.type).toBe("success");
    expect(lastMetric.durationMs).toBe(5000);
  });
});

describe("Circuit Breaker", () => {
  beforeEach(() => {
    // Reset circuit breaker to closed state
    perplexityCircuitBreaker.forceReset();
  });

  it("should start in closed state", () => {
    const state = perplexityCircuitBreaker.getState();
    expect(state).toBe(CircuitState.CLOSED);
  });

  it("should provide stats", () => {
    const stats = perplexityCircuitBreaker.getStats();
    
    expect(stats).toHaveProperty("state");
    expect(stats).toHaveProperty("failures");
    expect(stats).toHaveProperty("recentFailures");
  });

  it("should allow force reset", () => {
    // Record some failures first
    perplexityCircuitBreaker.recordFailure();
    perplexityCircuitBreaker.recordFailure();
    
    // Force reset
    perplexityCircuitBreaker.forceReset();
    
    const state = perplexityCircuitBreaker.getState();
    expect(state).toBe(CircuitState.CLOSED);
  });
});

describe("Error Monitoring Dashboard", () => {
  it("should return dashboard data", () => {
    const data = getDashboardData();
    
    expect(data).toBeDefined();
    expect(typeof data).toBe("object");
  });

  it("should return health status", () => {
    const health = getHealthStatus();
    
    expect(health).toHaveProperty("status");
    expect(["healthy", "degraded", "unhealthy"]).toContain(health.status);
  });

  it("should return metrics", () => {
    const metrics = getMetrics();
    
    expect(metrics).toBeDefined();
    expect(typeof metrics).toBe("object");
  });
});

describe("Logging Functions", () => {
  it("should log analysis start without errors", () => {
    expect(() => {
      logAnalysisStart("test-session", "full", "Test problem statement");
    }).not.toThrow();
  });

  it("should log part completion without errors", () => {
    expect(() => {
      logPartComplete("test-session", 1, 6);
    }).not.toThrow();
  });

  it("should log analysis completion without errors", () => {
    expect(() => {
      logAnalysisComplete("test-session", "full", 5000, true);
    }).not.toThrow();
    
    expect(() => {
      logAnalysisComplete("test-session", "full", 5000, false, 75);
    }).not.toThrow();
  });

  it("should log errors without throwing", () => {
    const error = new Error("Test error");
    
    expect(() => {
      logError(error, { sessionId: "test-session", tier: "full", duration: 5000 });
    }).not.toThrow();
  });
});
