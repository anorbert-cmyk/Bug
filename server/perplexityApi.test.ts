/**
 * Tests for Perplexity API Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { executeApexAnalysis, isPerplexityConfigured } from "./services/perplexityApiService";
import { generateApexPartPrompt } from "../shared/apexPrompt";

describe("Perplexity API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env
    delete process.env.PERPLEXITY_API_KEY;
  });

  describe("isPerplexityConfigured", () => {
    it("should return false when API key is not set", () => {
      delete process.env.PERPLEXITY_API_KEY;
      expect(isPerplexityConfigured()).toBe(false);
    });

    it("should return true when API key is set", () => {
      process.env.PERPLEXITY_API_KEY = "test-api-key";
      expect(isPerplexityConfigured()).toBe(true);
    });
  });

  describe("generateApexPartPrompt", () => {
    it("should replace placeholders in the prompt", () => {
      const userProblem = "Test problem statement";
      const partNumber = 1;
      
      const prompt = generateApexPartPrompt(userProblem, partNumber);
      
      expect(prompt).toContain("Test problem statement");
      expect(prompt).toContain("PART 1");
      expect(prompt).not.toContain("{user_problem}");
      expect(prompt).not.toContain("{part_number}");
    });

    it("should generate different prompts for different parts", () => {
      const userProblem = "Test problem";
      
      const prompt1 = generateApexPartPrompt(userProblem, 1);
      const prompt2 = generateApexPartPrompt(userProblem, 2);
      const prompt3 = generateApexPartPrompt(userProblem, 3);
      const prompt4 = generateApexPartPrompt(userProblem, 4);
      
      // All should contain the problem
      expect(prompt1).toContain("Test problem");
      expect(prompt2).toContain("Test problem");
      expect(prompt3).toContain("Test problem");
      expect(prompt4).toContain("Test problem");
      
      // Each should reference its part number
      expect(prompt1).toContain("PART 1");
      expect(prompt2).toContain("PART 2");
      expect(prompt3).toContain("PART 3");
      expect(prompt4).toContain("PART 4");
    });
  });

  describe("executeApexAnalysis", () => {
    it("should throw error when API key is not configured", async () => {
      delete process.env.PERPLEXITY_API_KEY;
      
      await expect(executeApexAnalysis("Test problem")).rejects.toThrow(
        "PERPLEXITY_API_KEY is not configured"
      );
    });

    it("should make 4 API calls for complete analysis", async () => {
      process.env.PERPLEXITY_API_KEY = "test-api-key";
      
      // Mock successful responses for all 4 parts
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test-id",
          model: "sonar-pro",
          created: Date.now(),
          usage: { prompt_tokens: 100, completion_tokens: 500, total_tokens: 600 },
          choices: [{ index: 0, message: { content: "Test response", role: "assistant" }, finish_reason: "stop" }],
          search_results: [{ title: "Test Source", url: "https://example.com", date: "2024-01-01" }],
        }),
      });

      const callbacks = {
        onPartStart: vi.fn(),
        onPartComplete: vi.fn(),
      };

      const result = await executeApexAnalysis("Test problem", callbacks);

      // Should have made 4 API calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      // Should have called callbacks for each part
      expect(callbacks.onPartStart).toHaveBeenCalledTimes(4);
      expect(callbacks.onPartComplete).toHaveBeenCalledTimes(4);
      
      // Should return 4 parts
      expect(result.parts).toHaveLength(4);
      
      // Should have full markdown
      expect(result.fullMarkdown).toContain("Part 1");
      expect(result.fullMarkdown).toContain("Part 2");
      expect(result.fullMarkdown).toContain("Part 3");
      expect(result.fullMarkdown).toContain("Part 4");
      
      // Should have search results
      expect(result.searchResults).toHaveLength(1);
      expect(result.searchResults[0].title).toBe("Test Source");
      
      // Should have token count
      expect(result.totalTokens).toBe(2400); // 600 * 4
    });

    it("should handle API errors gracefully", async () => {
      process.env.PERPLEXITY_API_KEY = "test-api-key";
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const onError = vi.fn();

      await expect(
        executeApexAnalysis("Test problem", { onError })
      ).rejects.toThrow("Perplexity API error: 401 - Unauthorized");

      expect(onError).toHaveBeenCalled();
    });

    it("should deduplicate search results across parts", async () => {
      process.env.PERPLEXITY_API_KEY = "test-api-key";
      
      // Mock responses with duplicate search results
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "test-id",
          model: "sonar-pro",
          created: Date.now(),
          usage: { prompt_tokens: 100, completion_tokens: 500, total_tokens: 600 },
          choices: [{ index: 0, message: { content: "Test response", role: "assistant" }, finish_reason: "stop" }],
          search_results: [
            { title: "Duplicate Source", url: "https://example.com/same", date: "2024-01-01" },
          ],
        }),
      });

      const result = await executeApexAnalysis("Test problem");

      // Should deduplicate - only 1 unique URL despite 4 API calls
      expect(result.searchResults).toHaveLength(1);
    });
  });
});

describe("APEX Master Prompt", () => {
  it("should contain all 4 part definitions", () => {
    const prompt = generateApexPartPrompt("test", 1);
    
    expect(prompt).toContain("PART 1 – Discovery & Problem Analysis");
    expect(prompt).toContain("PART 2 – Strategic Design & Roadmap");
    expect(prompt).toContain("PART 3 – AI Toolkit, Deliverables & 10 High-Fidelity Figma Prompts");
    expect(prompt).toContain("PART 4 – Risk, Metrics & Strategic Rationale");
  });

  it("should contain completion markers", () => {
    const prompt = generateApexPartPrompt("test", 1);
    
    expect(prompt).toContain("[✅ PART 1 COMPLETE]");
    expect(prompt).toContain("[✅ PART 2 COMPLETE]");
    expect(prompt).toContain("[✅ PART 3 COMPLETE]");
    expect(prompt).toContain("[✅ PART 4 COMPLETE");
  });

  it("should contain design ethos principles", () => {
    const prompt = generateApexPartPrompt("test", 1);
    
    expect(prompt).toContain("Balance is Mandatory");
    expect(prompt).toContain("Business Risk Flagging");
    expect(prompt).toContain("Trust & Safety First");
    expect(prompt).toContain("Clarity over Flash");
  });

  it("should contain evidence handling rules", () => {
    const prompt = generateApexPartPrompt("test", 1);
    
    expect(prompt).toContain("VERIFIED");
    expect(prompt).toContain("BEST PRACTICE");
    expect(prompt).toContain("ASSUMPTION");
    expect(prompt).toContain("No placeholders");
  });
});
