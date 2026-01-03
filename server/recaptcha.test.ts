import { describe, it, expect } from "vitest";

describe("reCAPTCHA v3 Configuration", () => {
  it("should have VITE_RECAPTCHA_SITE_KEY configured", () => {
    expect(process.env.VITE_RECAPTCHA_SITE_KEY).toBeDefined();
    expect(process.env.VITE_RECAPTCHA_SITE_KEY).not.toBe("");
    console.log("✅ VITE_RECAPTCHA_SITE_KEY is configured!");
  });

  it("should have RECAPTCHA_SECRET_KEY configured", () => {
    expect(process.env.RECAPTCHA_SECRET_KEY).toBeDefined();
    expect(process.env.RECAPTCHA_SECRET_KEY).not.toBe("");
    console.log("✅ RECAPTCHA_SECRET_KEY is configured!");
  });

  it("should have valid reCAPTCHA site key format", () => {
    const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY;
    // reCAPTCHA v3 site keys are typically 40 characters
    expect(siteKey?.length).toBeGreaterThanOrEqual(30);
    expect(siteKey).toMatch(/^[A-Za-z0-9_-]+$/);
    console.log("✅ Site key format is valid!");
  });

  it("should verify reCAPTCHA secret key with Google API", async () => {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    // Make a test verification request (will fail with empty token, but validates API key format)
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=test_token`,
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    
    // The request should succeed (even if verification fails due to invalid token)
    // If the secret key is invalid, Google returns error-codes including "invalid-input-secret"
    const hasInvalidSecret = data["error-codes"]?.includes("invalid-input-secret");
    expect(hasInvalidSecret).toBe(false);
    
    console.log("✅ reCAPTCHA secret key is valid (API responded without invalid-input-secret error)!");
  });
});
