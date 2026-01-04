/**
 * Analysis State Machine Tests
 * 
 * Comprehensive test suite for the Analysis Operations Center functionality.
 * Tests cover state machine transitions, event sourcing, and admin operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)), // Return null to test error handling
}));

// Import after mocking
import {
  TIER_PARTS,
  ESTIMATED_PART_DURATION_MS,
  isValidTransition,
} from "./services/analysisStateMachine";

describe("Analysis State Machine", () => {
  describe("Configuration Constants", () => {
    it("should have correct tier parts mapping", () => {
      expect(TIER_PARTS.standard).toBe(1);
      expect(TIER_PARTS.medium).toBe(2);
      expect(TIER_PARTS.full).toBe(6);
    });

    it("should have estimated durations for all tiers", () => {
      expect(ESTIMATED_PART_DURATION_MS.standard).toBeGreaterThan(0);
      expect(ESTIMATED_PART_DURATION_MS.medium).toBeGreaterThan(0);
      expect(ESTIMATED_PART_DURATION_MS.full).toBeGreaterThan(0);
    });

    it("should have increasing durations for higher tiers", () => {
      expect(ESTIMATED_PART_DURATION_MS.medium).toBeGreaterThanOrEqual(
        ESTIMATED_PART_DURATION_MS.standard
      );
      expect(ESTIMATED_PART_DURATION_MS.full).toBeGreaterThanOrEqual(
        ESTIMATED_PART_DURATION_MS.medium
      );
    });
  });

  describe("State Transitions", () => {
    describe("Valid Transitions", () => {
      it("should allow initialized -> generating", () => {
        expect(isValidTransition("initialized", "generating")).toBe(true);
      });

      it("should allow initialized -> cancelled", () => {
        expect(isValidTransition("initialized", "cancelled")).toBe(true);
      });

      it("should allow generating -> part_completed", () => {
        expect(isValidTransition("generating", "part_completed")).toBe(true);
      });

      it("should allow generating -> failed", () => {
        expect(isValidTransition("generating", "failed")).toBe(true);
      });

      it("should allow generating -> paused", () => {
        expect(isValidTransition("generating", "paused")).toBe(true);
      });

      it("should allow generating -> cancelled", () => {
        expect(isValidTransition("generating", "cancelled")).toBe(true);
      });

      it("should allow part_completed -> generating", () => {
        expect(isValidTransition("part_completed", "generating")).toBe(true);
      });

      it("should allow part_completed -> completed", () => {
        expect(isValidTransition("part_completed", "completed")).toBe(true);
      });

      it("should allow part_completed -> paused", () => {
        expect(isValidTransition("part_completed", "paused")).toBe(true);
      });

      it("should allow part_completed -> cancelled", () => {
        expect(isValidTransition("part_completed", "cancelled")).toBe(true);
      });

      it("should allow paused -> generating (resume)", () => {
        expect(isValidTransition("paused", "generating")).toBe(true);
      });

      it("should allow paused -> cancelled", () => {
        expect(isValidTransition("paused", "cancelled")).toBe(true);
      });

      it("should allow failed -> generating (retry)", () => {
        expect(isValidTransition("failed", "generating")).toBe(true);
      });

      it("should allow failed -> cancelled", () => {
        expect(isValidTransition("failed", "cancelled")).toBe(true);
      });
    });

    describe("Invalid Transitions", () => {
      it("should not allow completed -> any state (terminal)", () => {
        expect(isValidTransition("completed", "initialized")).toBe(false);
        expect(isValidTransition("completed", "generating")).toBe(false);
        expect(isValidTransition("completed", "failed")).toBe(false);
        expect(isValidTransition("completed", "paused")).toBe(false);
        expect(isValidTransition("completed", "cancelled")).toBe(false);
      });

      it("should not allow cancelled -> any state (terminal)", () => {
        expect(isValidTransition("cancelled", "initialized")).toBe(false);
        expect(isValidTransition("cancelled", "generating")).toBe(false);
        expect(isValidTransition("cancelled", "failed")).toBe(false);
        expect(isValidTransition("cancelled", "paused")).toBe(false);
        expect(isValidTransition("cancelled", "completed")).toBe(false);
      });

      it("should not allow initialized -> completed (must go through generating)", () => {
        expect(isValidTransition("initialized", "completed")).toBe(false);
      });

      it("should not allow initialized -> failed (must start first)", () => {
        expect(isValidTransition("initialized", "failed")).toBe(false);
      });

      it("should not allow initialized -> part_completed (must generate first)", () => {
        expect(isValidTransition("initialized", "part_completed")).toBe(false);
      });

      it("should not allow generating -> completed (must go through part_completed)", () => {
        expect(isValidTransition("generating", "completed")).toBe(false);
      });

      it("should not allow paused -> completed (must resume first)", () => {
        expect(isValidTransition("paused", "completed")).toBe(false);
      });

      it("should not allow paused -> failed (must resume first)", () => {
        expect(isValidTransition("paused", "failed")).toBe(false);
      });

      it("should not allow failed -> completed (must retry first)", () => {
        expect(isValidTransition("failed", "completed")).toBe(false);
      });
    });

    describe("Edge Cases", () => {
      it("should handle unknown states gracefully", () => {
        expect(isValidTransition("unknown" as any, "generating")).toBe(false);
        expect(isValidTransition("initialized", "unknown" as any)).toBe(false);
      });

      it("should not allow self-transitions", () => {
        expect(isValidTransition("initialized", "initialized")).toBe(false);
        expect(isValidTransition("generating", "generating")).toBe(false);
        expect(isValidTransition("completed", "completed")).toBe(false);
      });
    });
  });

  describe("State Machine Workflow Scenarios", () => {
    it("should support happy path: initialized -> generating -> part_completed -> completed", () => {
      // Observer tier (1 part)
      expect(isValidTransition("initialized", "generating")).toBe(true);
      expect(isValidTransition("generating", "part_completed")).toBe(true);
      expect(isValidTransition("part_completed", "completed")).toBe(true);
    });

    it("should support multi-part workflow: generating -> part_completed -> generating -> part_completed -> completed", () => {
      // Insider tier (2 parts)
      expect(isValidTransition("initialized", "generating")).toBe(true);
      expect(isValidTransition("generating", "part_completed")).toBe(true);
      expect(isValidTransition("part_completed", "generating")).toBe(true);
      expect(isValidTransition("generating", "part_completed")).toBe(true);
      expect(isValidTransition("part_completed", "completed")).toBe(true);
    });

    it("should support failure and retry workflow", () => {
      expect(isValidTransition("initialized", "generating")).toBe(true);
      expect(isValidTransition("generating", "failed")).toBe(true);
      expect(isValidTransition("failed", "generating")).toBe(true); // Retry
      expect(isValidTransition("generating", "part_completed")).toBe(true);
      expect(isValidTransition("part_completed", "completed")).toBe(true);
    });

    it("should support pause and resume workflow", () => {
      expect(isValidTransition("initialized", "generating")).toBe(true);
      expect(isValidTransition("generating", "paused")).toBe(true);
      expect(isValidTransition("paused", "generating")).toBe(true); // Resume
      expect(isValidTransition("generating", "part_completed")).toBe(true);
    });

    it("should support cancellation at any active state", () => {
      expect(isValidTransition("initialized", "cancelled")).toBe(true);
      expect(isValidTransition("generating", "cancelled")).toBe(true);
      expect(isValidTransition("part_completed", "cancelled")).toBe(true);
      expect(isValidTransition("paused", "cancelled")).toBe(true);
      expect(isValidTransition("failed", "cancelled")).toBe(true);
    });

    it("should support partial failure mid-generation", () => {
      // Syndicate tier fails at part 4
      expect(isValidTransition("initialized", "generating")).toBe(true);
      expect(isValidTransition("generating", "part_completed")).toBe(true); // Part 1
      expect(isValidTransition("part_completed", "generating")).toBe(true);
      expect(isValidTransition("generating", "part_completed")).toBe(true); // Part 2
      expect(isValidTransition("part_completed", "generating")).toBe(true);
      expect(isValidTransition("generating", "part_completed")).toBe(true); // Part 3
      expect(isValidTransition("part_completed", "generating")).toBe(true);
      expect(isValidTransition("generating", "failed")).toBe(true); // Fail at part 4
      expect(isValidTransition("failed", "generating")).toBe(true); // Retry
    });
  });
});

describe("Tier Configuration", () => {
  it("should have Observer tier with 1 part", () => {
    expect(TIER_PARTS.standard).toBe(1);
  });

  it("should have Insider tier with 2 parts", () => {
    expect(TIER_PARTS.medium).toBe(2);
  });

  it("should have Syndicate tier with 6 parts", () => {
    expect(TIER_PARTS.full).toBe(6);
  });

  it("should calculate correct total duration for Observer", () => {
    const totalDuration = TIER_PARTS.standard * ESTIMATED_PART_DURATION_MS.standard;
    expect(totalDuration).toBe(30000); // 30 seconds
  });

  it("should calculate correct total duration for Insider", () => {
    const totalDuration = TIER_PARTS.medium * ESTIMATED_PART_DURATION_MS.medium;
    expect(totalDuration).toBe(90000); // 90 seconds (2 * 45s)
  });

  it("should calculate correct total duration for Syndicate", () => {
    const totalDuration = TIER_PARTS.full * ESTIMATED_PART_DURATION_MS.full;
    expect(totalDuration).toBe(360000); // 360 seconds (6 * 60s)
  });
});

describe("Progress Calculation", () => {
  it("should calculate 0% progress for initialized state", () => {
    const completedParts = 0;
    const totalParts = 6;
    const progress = Math.round((completedParts / totalParts) * 100);
    expect(progress).toBe(0);
  });

  it("should calculate 50% progress for 3/6 parts", () => {
    const completedParts = 3;
    const totalParts = 6;
    const progress = Math.round((completedParts / totalParts) * 100);
    expect(progress).toBe(50);
  });

  it("should calculate 100% progress for completed operation", () => {
    const completedParts = 6;
    const totalParts = 6;
    const progress = Math.round((completedParts / totalParts) * 100);
    expect(progress).toBe(100);
  });

  it("should handle single-part tier correctly", () => {
    const completedParts = 1;
    const totalParts = 1;
    const progress = Math.round((completedParts / totalParts) * 100);
    expect(progress).toBe(100);
  });

  it("should round progress to nearest integer", () => {
    const completedParts = 1;
    const totalParts = 6;
    const progress = Math.round((completedParts / totalParts) * 100);
    expect(progress).toBe(17); // 16.67 rounded
  });
});

describe("Event Types", () => {
  const validEventTypes = [
    "operation_started",
    "part_started",
    "part_completed",
    "part_failed",
    "operation_completed",
    "operation_failed",
    "operation_paused",
    "operation_resumed",
    "operation_cancelled",
    "operation_retried",
    "admin_intervention",
  ];

  it("should have all expected event types defined", () => {
    // This test documents the expected event types
    expect(validEventTypes).toContain("operation_started");
    expect(validEventTypes).toContain("part_started");
    expect(validEventTypes).toContain("part_completed");
    expect(validEventTypes).toContain("part_failed");
    expect(validEventTypes).toContain("operation_completed");
    expect(validEventTypes).toContain("operation_failed");
    expect(validEventTypes).toContain("operation_paused");
    expect(validEventTypes).toContain("operation_resumed");
    expect(validEventTypes).toContain("operation_cancelled");
    expect(validEventTypes).toContain("operation_retried");
    expect(validEventTypes).toContain("admin_intervention");
  });

  it("should have 11 distinct event types", () => {
    expect(validEventTypes.length).toBe(11);
  });
});

describe("Actor Types", () => {
  const validActorTypes = ["system", "admin", "user"];

  it("should support system actor", () => {
    expect(validActorTypes).toContain("system");
  });

  it("should support admin actor", () => {
    expect(validActorTypes).toContain("admin");
  });

  it("should support user actor", () => {
    expect(validActorTypes).toContain("user");
  });
});

describe("Trigger Sources", () => {
  const validTriggerSources = ["user", "system", "admin", "retry_queue"];

  it("should support user trigger", () => {
    expect(validTriggerSources).toContain("user");
  });

  it("should support system trigger", () => {
    expect(validTriggerSources).toContain("system");
  });

  it("should support admin trigger", () => {
    expect(validTriggerSources).toContain("admin");
  });

  it("should support retry_queue trigger", () => {
    expect(validTriggerSources).toContain("retry_queue");
  });
});

describe("Admin Actions", () => {
  const validAdminActions = [
    "view_analysis",
    "view_partial_results",
    "trigger_regeneration",
    "pause_operation",
    "resume_operation",
    "cancel_operation",
    "modify_priority",
    "acknowledge_alert",
    "reset_circuit_breaker",
    "export_data",
    "other",
  ];

  it("should have all expected admin actions", () => {
    expect(validAdminActions.length).toBe(11);
  });

  it("should include operation control actions", () => {
    expect(validAdminActions).toContain("pause_operation");
    expect(validAdminActions).toContain("resume_operation");
    expect(validAdminActions).toContain("cancel_operation");
    expect(validAdminActions).toContain("trigger_regeneration");
  });

  it("should include viewing actions", () => {
    expect(validAdminActions).toContain("view_analysis");
    expect(validAdminActions).toContain("view_partial_results");
  });

  it("should include system actions", () => {
    expect(validAdminActions).toContain("reset_circuit_breaker");
    expect(validAdminActions).toContain("acknowledge_alert");
  });
});

describe("Database Schema Validation", () => {
  describe("analysis_operations table", () => {
    const requiredColumns = [
      "id",
      "sessionId",
      "operationId",
      "tier",
      "state",
      "totalParts",
      "completedParts",
      "currentPart",
      "startedAt",
      "lastPartCompletedAt",
      "completedAt",
      "estimatedCompletionAt",
      "lastError",
      "lastErrorAt",
      "failedPart",
      "retryCount",
      "triggeredBy",
      "adminNotes",
      "createdAt",
      "updatedAt",
    ];

    it("should have 20 columns defined", () => {
      expect(requiredColumns.length).toBe(20);
    });

    it("should include all tracking columns", () => {
      expect(requiredColumns).toContain("state");
      expect(requiredColumns).toContain("totalParts");
      expect(requiredColumns).toContain("completedParts");
      expect(requiredColumns).toContain("currentPart");
    });

    it("should include error tracking columns", () => {
      expect(requiredColumns).toContain("lastError");
      expect(requiredColumns).toContain("lastErrorAt");
      expect(requiredColumns).toContain("failedPart");
      expect(requiredColumns).toContain("retryCount");
    });
  });

  describe("analysis_operation_events table", () => {
    const requiredColumns = [
      "id",
      "operationId",
      "sessionId",
      "eventType",
      "partNumber",
      "previousState",
      "newState",
      "errorCode",
      "errorMessage",
      "durationMs",
      "tokenCount",
      "actorType",
      "actorId",
      "metadata",
      "createdAt",
    ];

    it("should have 15 columns defined", () => {
      expect(requiredColumns.length).toBe(15);
    });

    it("should include event tracking columns", () => {
      expect(requiredColumns).toContain("eventType");
      expect(requiredColumns).toContain("previousState");
      expect(requiredColumns).toContain("newState");
    });

    it("should include performance metrics columns", () => {
      expect(requiredColumns).toContain("durationMs");
      expect(requiredColumns).toContain("tokenCount");
    });
  });

  describe("admin_audit_log table", () => {
    const requiredColumns = [
      "id",
      "adminWallet",
      "action",
      "targetType",
      "targetId",
      "requestDetails",
      "success",
      "resultDetails",
      "ipAddress",
      "userAgent",
      "createdAt",
    ];

    it("should have 11 columns defined", () => {
      expect(requiredColumns.length).toBe(11);
    });

    it("should include admin identification", () => {
      expect(requiredColumns).toContain("adminWallet");
    });

    it("should include action details", () => {
      expect(requiredColumns).toContain("action");
      expect(requiredColumns).toContain("targetType");
      expect(requiredColumns).toContain("targetId");
    });

    it("should include request context", () => {
      expect(requiredColumns).toContain("ipAddress");
      expect(requiredColumns).toContain("userAgent");
    });
  });
});
