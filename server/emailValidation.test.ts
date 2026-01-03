import { describe, it, expect } from "vitest";
import { 
  validateEmail, 
  isDisposableEmail, 
  isValidEmailFormat, 
  hasValidTLD,
  generateVerificationToken 
} from "./services/emailValidationService";

describe("Email Validation Service", () => {
  describe("validateEmail", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@gmail.com",
        "first.last@subdomain.domain.co.uk",
      ];
      
      for (const email of validEmails) {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "noat.com",
        "spaces in@email.com",
        "",
      ];
      
      for (const email of invalidEmails) {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
      }
    });

    it("should reject disposable email addresses", () => {
      const disposableEmails = [
        "test@mailinator.com",
        "user@guerrillamail.com",
        "spam@tempmail.com",
        "fake@10minutemail.com",
        "temp@yopmail.com",
      ];
      
      for (const email of disposableEmails) {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.isDisposable).toBe(true);
        expect(result.error).toContain("Disposable");
      }
    });
  });

  describe("isDisposableEmail", () => {
    it("should detect known disposable domains", () => {
      expect(isDisposableEmail("test@mailinator.com")).toBe(true);
      expect(isDisposableEmail("test@guerrillamail.com")).toBe(true);
      expect(isDisposableEmail("test@tempmail.com")).toBe(true);
    });

    it("should allow legitimate email domains", () => {
      expect(isDisposableEmail("test@gmail.com")).toBe(false);
      expect(isDisposableEmail("test@outlook.com")).toBe(false);
      expect(isDisposableEmail("test@company.com")).toBe(false);
    });
  });

  describe("isValidEmailFormat", () => {
    it("should validate correct email formats", () => {
      expect(isValidEmailFormat("test@example.com")).toBe(true);
      expect(isValidEmailFormat("user.name+tag@domain.co.uk")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(isValidEmailFormat("notanemail")).toBe(false);
      expect(isValidEmailFormat("@domain.com")).toBe(false);
      expect(isValidEmailFormat("user@")).toBe(false);
    });
  });

  describe("hasValidTLD", () => {
    it("should accept valid TLDs", () => {
      expect(hasValidTLD("test@example.com")).toBe(true);
      expect(hasValidTLD("test@domain.co.uk")).toBe(true);
      expect(hasValidTLD("test@site.io")).toBe(true);
    });

    it("should reject invalid TLDs", () => {
      expect(hasValidTLD("test@domain")).toBe(false);
      expect(hasValidTLD("test@domain.")).toBe(false);
    });
  });

  describe("generateVerificationToken", () => {
    it("should generate a 64-character token", () => {
      const token = generateVerificationToken();
      expect(token.length).toBe(64);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateVerificationToken());
      }
      expect(tokens.size).toBe(100);
    });

    it("should only contain alphanumeric characters", () => {
      const token = generateVerificationToken();
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });
  });
});
