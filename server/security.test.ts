import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  createAnalysisSession: vi.fn().mockResolvedValue(undefined),
  getAnalysisSessionById: vi.fn(),
  updateAnalysisSessionStatus: vi.fn().mockResolvedValue(undefined),
  getAnalysisSessionsByUserId: vi.fn().mockResolvedValue([]),
  createPurchase: vi.fn().mockResolvedValue(undefined),
  getPurchaseBySessionId: vi.fn(),
  updatePurchaseStatus: vi.fn().mockResolvedValue(undefined),
  getPurchasesByUserId: vi.fn().mockResolvedValue([]),
  createAnalysisResult: vi.fn().mockResolvedValue(undefined),
  getAnalysisResultBySessionId: vi.fn(),
  updateAnalysisResult: vi.fn().mockResolvedValue(undefined),
  getAnalysisResultsByUserId: vi.fn().mockResolvedValue([]),
  getAdminStats: vi.fn().mockResolvedValue(null),
  getTransactionHistory: vi.fn().mockResolvedValue([]),
  addAdminWallet: vi.fn().mockResolvedValue(undefined),
  getAdminWallets: vi.fn().mockResolvedValue([]),
  isAdminWallet: vi.fn().mockResolvedValue(false),
  isSignatureUsed: vi.fn().mockResolvedValue(false),
  markSignatureUsed: vi.fn().mockResolvedValue(undefined),
}));

// Mock services
vi.mock("./services/stripeService", () => ({
  createPaymentIntent: vi.fn(),
  isStripeConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("./services/coinbaseService", () => ({
  createCharge: vi.fn(),
  isCoinbaseConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("./services/walletAuthService", () => ({
  verifyAdminSignature: vi.fn(),
  verifyAdminSignatureWithChallenge: vi.fn(),
  checkAdminStatus: vi.fn(),
  generateChallenge: vi.fn().mockReturnValue({ challenge: "test-challenge", timestamp: Date.now() }),
}));

vi.mock("./services/perplexityService", () => ({
  generateAnalysis: vi.fn(),
  generateSingleAnalysis: vi.fn(),
  generateMultiPartAnalysis: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Security: Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("XSS Prevention in Problem Statement", () => {
    it("accepts plain text problem statements", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.create({
        problemStatement: "This is a normal problem statement without any malicious content",
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
    });

    it("handles HTML-like content in problem statement", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // The system should accept this but sanitize on output
      const result = await caller.session.create({
        problemStatement: "Problem with <script>alert('xss')</script> in description",
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
    });

    it("handles special characters in problem statement", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.create({
        problemStatement: "Problem with special chars: <>&\"'`{}[]|\\",
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
    });
  });

  describe("SQL Injection Prevention", () => {
    it("handles SQL-like content in problem statement", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.create({
        problemStatement: "Problem: '; DROP TABLE users; --",
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
    });

    it("handles UNION-based injection attempts", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.create({
        problemStatement: "Problem: ' UNION SELECT * FROM users WHERE '1'='1",
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
    });
  });

  describe("Input Length Validation", () => {
    it("rejects empty problem statement", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.session.create({
          problemStatement: "",
          tier: "standard",
        })
      ).rejects.toThrow();
    });

    it("rejects problem statement under minimum length", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.session.create({
          problemStatement: "Short",
          tier: "standard",
        })
      ).rejects.toThrow();
    });

    it("rejects problem statement over maximum length", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const longStatement = "a".repeat(5001);

      await expect(
        caller.session.create({
          problemStatement: longStatement,
          tier: "standard",
        })
      ).rejects.toThrow();
    });

    it("accepts problem statement at maximum length", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const maxStatement = "a".repeat(5000);

      const result = await caller.session.create({
        problemStatement: maxStatement,
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
    });
  });
});

describe("Security: Admin Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Wallet Address Validation", () => {
    it("rejects non-admin wallet for challenge request", async () => {
      const { checkAdminStatus } = await import("./services/walletAuthService");
      (checkAdminStatus as any).mockResolvedValueOnce(false);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.requestChallenge({
          walletAddress: "0x1234567890123456789012345678901234567890",
        })
      ).rejects.toThrow("Not an admin wallet");
    });

    it("allows admin wallet for challenge request", async () => {
      const { checkAdminStatus, generateChallenge } = await import("./services/walletAuthService");
      (checkAdminStatus as any).mockResolvedValueOnce(true);
      (generateChallenge as any).mockReturnValueOnce({ challenge: "12345678901234567890123456789012", timestamp: Date.now() });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.requestChallenge({
        walletAddress: "0xa14504ffe5E9A245c9d4079547Fa16fA0A823114",
      });

      expect(result).toHaveProperty("challenge");
      expect(result).toHaveProperty("timestamp");
      expect(result.challenge).toHaveLength(32);
    });
  });

  describe("Signature Verification", () => {
    it("rejects invalid signature", async () => {
      const { verifyAdminSignatureWithChallenge } = await import("./services/walletAuthService");
      (verifyAdminSignatureWithChallenge as any).mockResolvedValueOnce({
        success: false,
        isAdmin: false,
        error: "Invalid signature",
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.verifySignature({
          walletAddress: "0xa14504ffe5E9A245c9d4079547Fa16fA0A823114",
          signature: "invalid-signature",
          challenge: "test-challenge",
          timestamp: Date.now(),
        })
      ).rejects.toThrow("Invalid signature");
    });

    it("accepts valid signature", async () => {
      const { verifyAdminSignatureWithChallenge } = await import("./services/walletAuthService");
      (verifyAdminSignatureWithChallenge as any).mockResolvedValueOnce({
        success: true,
        isAdmin: true,
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.verifySignature({
        walletAddress: "0xa14504ffe5E9A245c9d4079547Fa16fA0A823114",
        signature: "valid-signature",
        challenge: "test-challenge",
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Admin Stats Access Control", () => {
    it("rejects unauthenticated access to stats", async () => {
      const { verifyAdminSignature } = await import("./services/walletAuthService");
      (verifyAdminSignature as any).mockResolvedValueOnce({
        success: false,
        error: "Invalid signature",
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.getStats({
          signature: "invalid",
          timestamp: Date.now(),
          address: "0x1234567890123456789012345678901234567890",
        })
      ).rejects.toThrow();
    });

    it("allows authenticated access to stats", async () => {
      const { verifyAdminSignature } = await import("./services/walletAuthService");
      const { getAdminStats } = await import("./db");
      
      (verifyAdminSignature as any).mockResolvedValueOnce({ success: true });
      (getAdminStats as any).mockResolvedValueOnce({
        totalRevenueUsd: 1000,
        totalRevenueCrypto: 0.5,
        totalPurchases: 10,
        tierDistribution: { standard: 5, medium: 3, full: 2 },
        paymentMethodDistribution: { stripe: 8, coinbase: 2 },
        conversionFunnel: { sessions: 100, payments: 20, completed: 10 },
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.getStats({
        signature: "valid",
        timestamp: Date.now(),
        address: "0xa14504ffe5E9A245c9d4079547Fa16fA0A823114",
      });

      expect(result).toHaveProperty("totalRevenueUsd");
      expect(result?.totalPurchases).toBe(10);
    });
  });
});

describe("Security: Protected Routes", () => {
  it("getMyAnalyses requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.session.getMyAnalyses()).rejects.toThrow();
  });

  it("getMyResults requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.analysis.getMyResults()).rejects.toThrow();
  });
});
