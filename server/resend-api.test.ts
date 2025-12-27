import { describe, it, expect } from "vitest";

/**
 * Test to validate that the Resend API key is properly configured
 * This test checks if the environment variable is set and has the correct format
 */
describe("Resend API Configuration", () => {
  it("should have RESEND_API_KEY environment variable set", () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
  });

  it("should have valid Resend API key format (starts with re_)", () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.startsWith("re_")).toBe(true);
  });

  it("should have RESEND_FROM_EMAIL environment variable set", () => {
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    expect(fromEmail).toBeDefined();
    expect(fromEmail).not.toBe("");
  });

  it("should have valid email format for RESEND_FROM_EMAIL", () => {
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    expect(fromEmail).toBeDefined();
    // Basic email format check
    expect(fromEmail).toMatch(/@/);
  });
});
