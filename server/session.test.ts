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
  checkAdminStatus: vi.fn().mockResolvedValue(false),
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

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Session Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("session.create", () => {
    it("creates a session with valid input", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.create({
        problemStatement: "This is a valid problem statement for testing",
        tier: "standard",
      });

      expect(result).toHaveProperty("sessionId");
      expect(result.sessionId).toHaveLength(16);
      expect(result.tier).toBe("standard");
    });

    it("rejects problem statement shorter than 10 characters", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.session.create({
          problemStatement: "Short",
          tier: "standard",
        })
      ).rejects.toThrow();
    });

    it("rejects invalid tier", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.session.create({
          problemStatement: "This is a valid problem statement",
          tier: "invalid" as any,
        })
      ).rejects.toThrow();
    });

    it("accepts all valid tiers", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      for (const tier of ["standard", "medium", "full"] as const) {
        const result = await caller.session.create({
          problemStatement: "This is a valid problem statement for testing",
          tier,
        });
        expect(result.tier).toBe(tier);
      }
    });
  });

  describe("session.get", () => {
    it("returns session when found", async () => {
      const { getAnalysisSessionById } = await import("./db");
      (getAnalysisSessionById as any).mockResolvedValueOnce({
        id: 1,
        sessionId: "test-session-id",
        problemStatement: "Test problem",
        tier: "standard",
        status: "pending_payment",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.get({ sessionId: "test-session-id" });

      expect(result.sessionId).toBe("test-session-id");
      expect(result.tier).toBe("standard");
    });

    it("throws NOT_FOUND when session does not exist", async () => {
      const { getAnalysisSessionById } = await import("./db");
      (getAnalysisSessionById as any).mockResolvedValueOnce(null);

      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.session.get({ sessionId: "nonexistent" })
      ).rejects.toThrow("Session not found");
    });
  });

  describe("session.getMyAnalyses", () => {
    it("requires authentication", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.session.getMyAnalyses()).rejects.toThrow();
    });

    it("returns user analyses when authenticated", async () => {
      const { getAnalysisSessionsByUserId, getAnalysisResultsByUserId, getPurchasesByUserId } = await import("./db");
      
      (getAnalysisSessionsByUserId as any).mockResolvedValueOnce([
        {
          id: 1,
          sessionId: "session-1",
          userId: 1,
          problemStatement: "Test problem",
          tier: "standard",
          status: "completed",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (getAnalysisResultsByUserId as any).mockResolvedValueOnce([]);
      (getPurchasesByUserId as any).mockResolvedValueOnce([]);

      const ctx = createAuthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.session.getMyAnalyses();

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe("session-1");
    });
  });
});

describe("Pricing Router", () => {
  it("returns all tier configurations", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const tiers = await caller.pricing.getTiers();

    expect(tiers).toHaveLength(3);
    expect(tiers.map(t => t.id)).toContain("standard");
    expect(tiers.map(t => t.id)).toContain("medium");
    expect(tiers.map(t => t.id)).toContain("full");
  });

  it("returns specific tier configuration", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const tier = await caller.pricing.getTier({ tier: "full" });

    expect(tier?.id).toBe("full");
    expect(tier?.isMultiPart).toBe(true);
    expect(tier?.apiCalls).toBe(4);
  });
});

describe("Config Router", () => {
  it("returns payment configuration", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const config = await caller.config.getPaymentConfig();

    expect(config).toHaveProperty("lemonSqueezyEnabled");
    expect(config).toHaveProperty("coinbaseEnabled");
  });
});
