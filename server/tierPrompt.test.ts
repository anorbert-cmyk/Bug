/**
 * Tests for tier-specific prompt service and analysis generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Mock analysis content" } }],
  }),
}));

import {
  OBSERVER_SYSTEM_PROMPT,
  getObserverPrompt,
  INSIDER_SYSTEM_PROMPT,
  getInsiderInitialPrompt,
  getInsiderContinuePrompt,
  SYNDICATE_SYSTEM_PROMPT,
  getTierPromptConfig,
  TIER_PART_CONFIG,
} from "./services/tierPromptService";

import {
  generateSingleAnalysis,
  generateInsiderAnalysis,
  generateMultiPartAnalysis,
  generateAnalysis,
} from "./services/perplexityService";

describe("tierPromptService", () => {
  describe("Observer Tier Prompts", () => {
    it("should have a valid system prompt", () => {
      expect(OBSERVER_SYSTEM_PROMPT).toBeDefined();
      expect(OBSERVER_SYSTEM_PROMPT).toContain("sanity check");
      expect(OBSERVER_SYSTEM_PROMPT).toContain("viability");
    });

    it("should generate user prompt with problem statement", () => {
      const problem = "I want to build a crypto wallet app";
      const prompt = getObserverPrompt(problem);
      
      expect(prompt).toContain(problem);
      expect(prompt).toContain("QUICK SANITY CHECK");
      expect(prompt).toContain("OBSERVER TIER");
      expect(prompt).toContain("TOP 3 USER PAIN POINTS");
      expect(prompt).toContain("QUICK VIABILITY SCORE");
    });

    it("should NOT include Go/No-Go recommendation in Observer prompt", () => {
      const prompt = getObserverPrompt("test problem");
      // Observer provides viability score, not Go/No-Go (that's Insider)
      expect(prompt).not.toContain("GO/NO-GO Recommendation");
    });
  });

  describe("Insider Tier Prompts", () => {
    it("should have a valid system prompt", () => {
      expect(INSIDER_SYSTEM_PROMPT).toBeDefined();
      expect(INSIDER_SYSTEM_PROMPT).toContain("elite UX strategist");
      expect(INSIDER_SYSTEM_PROMPT).toContain("strategic execution plan");
    });

    it("should generate Part 1 prompt with problem statement", () => {
      const problem = "I want to build a SaaS dashboard";
      const prompt = getInsiderInitialPrompt(problem);
      
      expect(prompt).toContain(problem);
      expect(prompt).toContain("STRATEGIC BLUEPRINT ANALYSIS");
      expect(prompt).toContain("Part 1 of 2");
      expect(prompt).toContain("Competitor Analysis");
      expect(prompt).toContain("Assumption Ledger");
    });

    it("should generate Part 2 continue prompt", () => {
      const prompt = getInsiderContinuePrompt(2);
      
      expect(prompt).toContain("Part 2 of 2");
      expect(prompt).toContain("Strategic Design & Roadmap");
      expect(prompt).toContain("Phase-by-Phase Roadmap");
      expect(prompt).toContain("Risk Mitigations");
    });

    it("should NOT include Design Prompts in Insider prompt", () => {
      const prompt = getInsiderInitialPrompt("test problem");
      expect(prompt).not.toContain("Production-Ready Design Prompts");
    });
  });

  describe("Syndicate Tier Prompts", () => {
    it("should have a valid system prompt", () => {
      expect(SYNDICATE_SYSTEM_PROMPT).toBeDefined();
      expect(SYNDICATE_SYSTEM_PROMPT).toContain("elite UX strategist");
      expect(SYNDICATE_SYSTEM_PROMPT).toContain("6 parts"); // Updated from 4 to 6 for enhanced Syndicate tier
    });
  });

  describe("Tier Configuration", () => {
    it("should return correct config for Observer tier", () => {
      const config = getTierPromptConfig("standard");
      
      expect(config.parts).toBe(1);
      expect(config.systemPrompt).toBe(OBSERVER_SYSTEM_PROMPT);
      expect(config.getInitialPrompt).toBeDefined();
    });

    it("should return correct config for Insider tier", () => {
      const config = getTierPromptConfig("medium");
      
      expect(config.parts).toBe(2);
      expect(config.systemPrompt).toBe(INSIDER_SYSTEM_PROMPT);
      expect(config.getInitialPrompt).toBeDefined();
      expect(config.getContinuePrompt).toBeDefined();
    });

    it("should return correct config for Syndicate tier", () => {
      const config = getTierPromptConfig("full");
      
      expect(config.parts).toBe(6); // Updated from 4 to 6 for enhanced Syndicate tier
      expect(config.systemPrompt).toBe(SYNDICATE_SYSTEM_PROMPT);
    });

    it("should have correct part counts in TIER_PART_CONFIG", () => {
      expect(TIER_PART_CONFIG.observer.parts).toBe(1);
      expect(TIER_PART_CONFIG.insider.parts).toBe(2);
      expect(TIER_PART_CONFIG.syndicate.parts).toBe(6); // Updated from 4 to 6 for enhanced Syndicate tier
    });
  });
});

describe("perplexityService - Tier Routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSingleAnalysis", () => {
    it("should generate Observer tier analysis", async () => {
      const result = await generateSingleAnalysis("Test problem", "standard");
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.generatedAt).toBeGreaterThan(0);
    });
  });

  describe("generateInsiderAnalysis", () => {
    it("should generate 2-part Insider analysis", async () => {
      const callbacks = {
        onPartComplete: vi.fn(),
      };
      
      const result = await generateInsiderAnalysis("Test problem", callbacks);
      
      expect(result).toBeDefined();
      expect(result.part1).toBeDefined();
      expect(result.part2).toBeDefined();
      expect(result.fullMarkdown).toContain("Strategic Blueprint Analysis");
      expect(callbacks.onPartComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe("generateAnalysis - Tier Routing", () => {
    it("should route standard tier to single analysis", async () => {
      const result = await generateAnalysis("Test problem", "standard");
      
      expect(result).toBeDefined();
      expect("content" in result).toBe(true);
    });

    it("should route medium tier to Insider analysis", async () => {
      const result = await generateAnalysis("Test problem", "medium");
      
      expect(result).toBeDefined();
      expect("part1" in result).toBe(true);
      expect("part2" in result).toBe(true);
    });

    it("should route full tier to 6-part multi-part analysis", async () => {
      const result = await generateAnalysis("Test problem", "full");
      
      expect(result).toBeDefined();
      expect("part1" in result).toBe(true);
      expect("part2" in result).toBe(true);
      expect("part3" in result).toBe(true);
      expect("part4" in result).toBe(true);
      expect("part5" in result).toBe(true);
      expect("part6" in result).toBe(true);
    });
  });
});
