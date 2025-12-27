import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock environment variables
const mockEnv = {
  PAYPAL_CLIENT_ID: "test-client-id",
  PAYPAL_CLIENT_SECRET: "test-client-secret",
  PAYPAL_MODE: "sandbox",
  PAYPAL_WEBHOOK_ID: "test-webhook-id",
};

// Store original env
const originalEnv = { ...process.env };

beforeEach(() => {
  // Reset env before each test
  process.env = { ...originalEnv, ...mockEnv };
  vi.resetAllMocks();
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PayPal Service", () => {
  describe("isPayPalConfigured", () => {
    it("should return true when credentials are set", async () => {
      const { isPayPalConfigured } = await import("./services/paypalService");
      expect(isPayPalConfigured()).toBe(true);
    });

    it("should return false when credentials are missing", async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;
      
      // Re-import to get fresh module
      vi.resetModules();
      const { isPayPalConfigured } = await import("./services/paypalService");
      expect(isPayPalConfigured()).toBe(false);
    });
  });

  describe("createOrder", () => {
    it("should create a PayPal order successfully", async () => {
      // Mock access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock order creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ORDER123",
          links: [
            { rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123" },
          ],
        }),
      });

      vi.resetModules();
      const { createOrder } = await import("./services/paypalService");
      
      const result = await createOrder("standard", "session123", "Test problem");

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("ORDER123");
      expect(result.approvalUrl).toContain("paypal.com");
    });

    it("should return error when PayPal is not configured", async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;
      
      vi.resetModules();
      const { createOrder } = await import("./services/paypalService");
      
      const result = await createOrder("standard", "session123", "Test problem");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });

  describe("captureOrder", () => {
    it("should capture a PayPal order successfully", async () => {
      // Mock access token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test-access-token",
          expires_in: 3600,
        }),
      });

      // Mock capture response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "ORDER123",
          status: "COMPLETED",
          purchase_units: [{
            payments: {
              captures: [{ id: "CAPTURE123", status: "COMPLETED" }],
            },
          }],
        }),
      });

      vi.resetModules();
      const { captureOrder } = await import("./services/paypalService");
      
      const result = await captureOrder("ORDER123");

      expect(result.success).toBe(true);
      expect(result.captureId).toBe("CAPTURE123");
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("API URL selection", () => {
    it("should use sandbox URL in test mode", async () => {
      process.env.PAYPAL_MODE = "sandbox";
      
      // Mock responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token", expires_in: 3600 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ORDER123", links: [] }),
      });

      vi.resetModules();
      const { createOrder } = await import("./services/paypalService");
      await createOrder("standard", "session123", "Test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sandbox.paypal.com"),
        expect.any(Object)
      );
    });

    it("should use live URL in production mode", async () => {
      process.env.PAYPAL_MODE = "live";
      
      // Mock responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token", expires_in: 3600 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ORDER123", links: [] }),
      });

      vi.resetModules();
      const { createOrder } = await import("./services/paypalService");
      await createOrder("standard", "session123", "Test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api-m.paypal.com"),
        expect.any(Object)
      );
    });
  });
});
