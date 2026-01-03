/**
 * Advanced Error Handling Tests
 * 
 * Tests for:
 * - Admin alerts service
 * - Retry queue processor
 * - Metrics persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock getDb to return null (no database in tests)
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

import {
  sendAdminAlert,
  alertCircuitBreakerOpen,
  alertHighFailureRate,
  alertCriticalError,
  alertSystemIssue,
  recordRequestForFailureRate,
  getFailureRateStats,
  onCircuitBreakerStateChange,
} from "./services/adminAlerts";

import {
  addToRetryQueueDB,
  getNextQueueItem,
  markQueueItemCompleted,
  markQueueItemForRetry,
  cancelQueueItem,
  getQueueStats,
  startRetryQueueProcessor,
  stopRetryQueueProcessor,
  isProcessorRunning,
} from "./services/retryQueueProcessor";

import {
  recordMetricToDB,
  recordAnalysisRequestToDB,
  recordSuccessToDB,
  recordFailureToDB,
  recordRetryToDB,
  aggregateHourlyMetrics,
  runHourlyAggregation,
  getHistoricalMetrics,
  getRecentHistoricalMetrics,
  getRecentRawMetrics,
  getErrorSummary,
} from "./services/metricsPersistence";

// ============================================================================
// ADMIN ALERTS TESTS
// ============================================================================

describe("Admin Alerts Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendAdminAlert", () => {
    it("should send an alert successfully", async () => {
      const result = await sendAdminAlert({
        type: "system_alert",
        title: "Test Alert",
        message: "This is a test alert",
        severity: "info",
      });

      expect(result).toBe(true);
    });

    it("should rate limit duplicate alerts", async () => {
      // First alert should succeed
      const result1 = await sendAdminAlert({
        type: "circuit_breaker_open",
        title: "CB Open",
        message: "Test",
        severity: "critical",
        metadata: { service: "test-service" },
      });
      expect(result1).toBe(true);

      // Second identical alert should be rate limited
      const result2 = await sendAdminAlert({
        type: "circuit_breaker_open",
        title: "CB Open",
        message: "Test",
        severity: "critical",
        metadata: { service: "test-service" },
      });
      expect(result2).toBe(false);
    });
  });

  describe("alertCircuitBreakerOpen", () => {
    it("should send circuit breaker alert", async () => {
      const result = await alertCircuitBreakerOpen(
        "perplexity-api",
        5,
        "Connection timeout"
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("alertHighFailureRate", () => {
    it("should send high failure rate alert", async () => {
      const result = await alertHighFailureRate(
        45.5,
        30,
        15,
        ["Error 1", "Error 2"]
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("alertCriticalError", () => {
    it("should send critical error alert", async () => {
      const result = await alertCriticalError(
        "DATABASE_ERROR",
        "Connection pool exhausted",
        { connectionCount: 100 }
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("alertSystemIssue", () => {
    it("should send system issue alert", async () => {
      const result = await alertSystemIssue(
        "Memory Warning",
        "Memory usage above 80%",
        "warning",
        { memoryUsage: 85 }
      );
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Failure Rate Monitoring", () => {
    beforeEach(() => {
      // Reset failure rate window by recording many successes
      for (let i = 0; i < 20; i++) {
        recordRequestForFailureRate(true);
      }
    });

    it("should track request success/failure", () => {
      recordRequestForFailureRate(true);
      recordRequestForFailureRate(false);
      
      const stats = getFailureRateStats();
      expect(stats.requests).toBeGreaterThan(0);
      expect(stats.failures).toBeGreaterThan(0);
    });

    it("should calculate failure rate correctly", () => {
      // Record 10 requests: 3 failures, 7 successes
      for (let i = 0; i < 7; i++) {
        recordRequestForFailureRate(true);
      }
      for (let i = 0; i < 3; i++) {
        recordRequestForFailureRate(false);
      }
      
      const stats = getFailureRateStats();
      expect(stats.failureRate).toBeGreaterThan(0);
    });
  });

  describe("onCircuitBreakerStateChange", () => {
    it("should handle state change to open", () => {
      // Should not throw
      expect(() => {
        onCircuitBreakerStateChange("test-service", "open", {
          failures: 5,
          lastError: "Test error",
        });
      }).not.toThrow();
    });

    it("should handle state change to closed", () => {
      expect(() => {
        onCircuitBreakerStateChange("test-service", "closed", {
          failures: 0,
        });
      }).not.toThrow();
    });
  });
});

// ============================================================================
// RETRY QUEUE PROCESSOR TESTS
// ============================================================================

describe("Retry Queue Processor", () => {
  describe("Queue Management", () => {
    it("should handle adding to queue when DB is unavailable", async () => {
      const result = await addToRetryQueueDB({
        sessionId: "test-session-1",
        tier: "full",
        problemStatement: "Test problem",
        email: "test@example.com",
      });
      
      // Should return false when DB is not available
      expect(result).toBe(false);
    });

    it("should return null when getting next item with no DB", async () => {
      const item = await getNextQueueItem();
      expect(item).toBeNull();
    });

    it("should handle marking item completed gracefully", async () => {
      // Should not throw even when DB is unavailable
      await expect(markQueueItemCompleted("test-session")).resolves.not.toThrow();
    });

    it("should handle marking item for retry gracefully", async () => {
      const result = await markQueueItemForRetry("test-session", "Test error");
      expect(result).toBe(false);
    });

    it("should handle cancelling item gracefully", async () => {
      await expect(cancelQueueItem("test-session")).resolves.not.toThrow();
    });
  });

  describe("Queue Statistics", () => {
    it("should return empty stats when DB is unavailable", async () => {
      const stats = await getQueueStats();
      
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        total: 0,
      });
    });
  });

  describe("Background Processor", () => {
    afterEach(() => {
      stopRetryQueueProcessor();
    });

    it("should start and stop processor", () => {
      expect(isProcessorRunning()).toBe(false);
      
      startRetryQueueProcessor();
      expect(isProcessorRunning()).toBe(true);
      
      stopRetryQueueProcessor();
      expect(isProcessorRunning()).toBe(false);
    });

    it("should not start processor twice", () => {
      startRetryQueueProcessor();
      startRetryQueueProcessor(); // Should not throw
      
      expect(isProcessorRunning()).toBe(true);
    });
  });
});

// ============================================================================
// METRICS PERSISTENCE TESTS
// ============================================================================

describe("Metrics Persistence", () => {
  describe("Recording Metrics", () => {
    it("should handle recording metric when DB is unavailable", async () => {
      // Should not throw
      await expect(
        recordMetricToDB({
          sessionId: "test-session",
          tier: "full",
          eventType: "request",
        })
      ).resolves.not.toThrow();
    });

    it("should handle recording analysis request", async () => {
      await expect(
        recordAnalysisRequestToDB("test-session", "full", { source: "test" })
      ).resolves.not.toThrow();
    });

    it("should handle recording success", async () => {
      await expect(
        recordSuccessToDB("test-session", "full", 5000, { parts: 6 })
      ).resolves.not.toThrow();
    });

    it("should handle recording failure", async () => {
      await expect(
        recordFailureToDB("test-session", "full", 5000, "TIMEOUT", "Request timed out")
      ).resolves.not.toThrow();
    });

    it("should handle recording retry", async () => {
      await expect(
        recordRetryToDB("test-session", "full", 2, "Previous attempt failed")
      ).resolves.not.toThrow();
    });
  });

  describe("Hourly Aggregation", () => {
    it("should handle aggregation when DB is unavailable", async () => {
      const hourStart = new Date();
      hourStart.setMinutes(0, 0, 0);
      
      await expect(aggregateHourlyMetrics(hourStart)).resolves.not.toThrow();
    });

    it("should run hourly aggregation without errors", async () => {
      await expect(runHourlyAggregation()).resolves.not.toThrow();
    });
  });

  describe("Historical Metrics", () => {
    it("should return empty metrics when DB is unavailable", async () => {
      const metrics = await getHistoricalMetrics({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(metrics).toEqual({
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
      });
    });

    it("should get recent historical metrics", async () => {
      const metrics = await getRecentHistoricalMetrics(24);
      
      expect(metrics).toHaveProperty("totalRequests");
      expect(metrics).toHaveProperty("successRate");
      expect(metrics).toHaveProperty("byTier");
    });
  });

  describe("Raw Metrics", () => {
    it("should return empty array when DB is unavailable", async () => {
      const metrics = await getRecentRawMetrics(60);
      expect(metrics).toEqual([]);
    });
  });

  describe("Error Summary", () => {
    it("should return empty array when DB is unavailable", async () => {
      const summary = await getErrorSummary({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      });
      
      expect(summary).toEqual([]);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration", () => {
  it("should handle full error flow without throwing", async () => {
    // Simulate a failed analysis
    await recordAnalysisRequestToDB("integration-test", "full");
    
    // Record failure
    await recordFailureToDB("integration-test", "full", 5000, "API_ERROR", "Test error");
    
    // Add to retry queue
    await addToRetryQueueDB({
      sessionId: "integration-test",
      tier: "full",
      problemStatement: "Test problem",
    });
    
    // Record for failure rate monitoring
    recordRequestForFailureRate(false);
    
    // Get stats
    const queueStats = await getQueueStats();
    const failureStats = getFailureRateStats();
    
    expect(queueStats).toBeDefined();
    expect(failureStats).toBeDefined();
  });

  it("should handle processor lifecycle", () => {
    // Start processor
    startRetryQueueProcessor();
    expect(isProcessorRunning()).toBe(true);
    
    // Stop processor
    stopRetryQueueProcessor();
    expect(isProcessorRunning()).toBe(false);
  });
});
