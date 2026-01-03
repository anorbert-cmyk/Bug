/**
 * Pricing tiers and configuration for the analysis platform
 */

export type Tier = "standard" | "medium" | "full";

export interface TierConfig {
  id: Tier;
  name: string;
  displayName: string;
  priceUsd: number;
  description: string;
  features: string[];
  apiCalls: number;
  isMultiPart: boolean;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  standard: {
    id: "standard",
    name: "Observer",
    displayName: "Observer Tier",
    priceUsd: 49,
    description: "Essential UX insights for quick validation",
    features: [
      "Single-pass AI analysis",
      "Problem statement evaluation",
      "Basic UX recommendations",
      "PDF export",
    ],
    apiCalls: 1,
    isMultiPart: false,
  },
  medium: {
    id: "medium",
    name: "Insider",
    displayName: "Insider Tier",
    priceUsd: 99,
    description: "Comprehensive analysis with strategic insights",
    features: [
      "Enhanced AI analysis",
      "Market positioning insights",
      "Competitor landscape overview",
      "Strategic recommendations",
      "PDF export with visuals",
    ],
    apiCalls: 1,
    isMultiPart: false,
  },
  full: {
    id: "full",
    name: "Syndicate",
    displayName: "Syndicate Tier",
    priceUsd: 199,
    description: "Full strategic analysis with 4-part deep dive",
    features: [
      "4-part sequential deep analysis",
      "Real-time streaming results",
      "Discovery & Problem Analysis",
      "Strategic Design & Roadmap",
      "AI Toolkit & Figma Prompts",
      "Risk, Metrics & Rationale",
      "Full markdown report",
      "Priority support",
    ],
    apiCalls: 4,
    isMultiPart: true,
  },
};

export function getTierPrice(tier: Tier): number {
  return TIER_CONFIGS[tier]?.priceUsd ?? 0;
}

export function getTierConfig(tier: Tier): TierConfig | undefined {
  return TIER_CONFIGS[tier];
}

export function isMultiPartTier(tier: Tier): boolean {
  return TIER_CONFIGS[tier]?.isMultiPart ?? false;
}

/**
 * Multi-part analysis configuration
 */
export const MULTI_PART_CONFIG = {
  totalParts: 4,
  parts: [
    { number: 1, name: "Discovery & Problem Analysis", description: "Deep dive into the problem space and user needs" },
    { number: 2, name: "Strategic Design & Roadmap", description: "Design strategy and implementation roadmap" },
    { number: 3, name: "AI Toolkit & Figma Prompts", description: "Practical tools and design prompts" },
    { number: 4, name: "Risk, Metrics & Rationale", description: "Risk assessment and success metrics" },
  ],
};
