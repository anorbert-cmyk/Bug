/**
 * Pricing tiers and configuration for the analysis platform
 */

export type Tier = "standard" | "medium" | "full";

export interface TierConfig {
  id: Tier;
  name: string;
  displayName: string;
  priceUsd: number;
  headline: string;
  tagline: string;
  description: string;
  features: string[];
  badge: string;
  ctaText: string;
  footerText: string;
  deliveryTime: string;
  outputLength: string;
  apiCalls: number;
  isMultiPart: boolean;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  standard: {
    id: "standard",
    name: "Observer",
    displayName: "Observer Tier",
    priceUsd: 49,
    headline: "Validate Your Idea",
    tagline: "Get a clear GO/NO-GO decision with actionable next steps in 24 hours.",
    description: "Quick validation for early-stage concepts",
    badge: "QUICK VALIDATION",
    ctaText: "Validate My Idea",
    footerText: "Perfect for early-stage founders testing concepts",
    deliveryTime: "24 hours",
    outputLength: "1-2 pages",
    features: [
      "Problem-Market Fit Analysis",
      "3 Competitor Quick Scan",
      "Top 5 User Pain Points Identified",
      "Go/No-Go Recommendation",
      "3 Immediate Action Items",
      "24-Hour Delivery",
    ],
    apiCalls: 1,
    isMultiPart: false,
  },
  medium: {
    id: "medium",
    name: "Insider",
    displayName: "Insider Tier",
    priceUsd: 99,
    headline: "Your 90-Day Roadmap",
    tagline: "From validated idea to execution plan with clear milestones and risk mitigation.",
    description: "Strategic blueprint for execution-ready founders",
    badge: "MOST POPULAR",
    ctaText: "Get My Roadmap",
    footerText: "Ideal for founders ready to execute",
    deliveryTime: "48 hours",
    outputLength: "5-8 pages",
    features: [
      "Everything in Observer, plus:",
      "Full Discovery & Problem Analysis",
      "Strategic Design Roadmap",
      "Week-by-Week Action Plan",
      "Team Collaboration Model",
      "5 Critical Risk Mitigations",
      "48-Hour Delivery",
    ],
    apiCalls: 1,
    isMultiPart: false,
  },
  full: {
    id: "full",
    name: "Syndicate",
    displayName: "Syndicate Tier",
    priceUsd: 199,
    headline: "Complete UX Strategy",
    tagline: "Enterprise-grade 6-part analysis with 10 production-ready Figma prompts you can build from today.",
    description: "Full strategic analysis with design-ready outputs",
    badge: "APEX • STATE-OF-THE-ART AI",
    ctaText: "Get Full APEX Analysis",
    footerText: "For teams building production-ready products",
    deliveryTime: "72 hours",
    outputLength: "15-20 pages",
    features: [
      "Everything in Insider, plus:",
      "AI-Enhanced Execution Toolkit",
      "10 Production-Ready Figma Prompts",
      "Copy-Paste Directly into Figma AI",
      "Full Risk Matrix & Metrics Dashboard",
      "Business OKR Alignment",
      "Compliance Checkpoints",
      "72-Hour Delivery",
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

/**
 * Feature comparison for pricing grid
 */
export const FEATURE_COMPARISON = [
  { feature: "Problem Validation", observer: true, insider: true, syndicate: true },
  { feature: "Competitor Analysis", observer: "3", insider: "5", syndicate: "5+ with UX teardown" },
  { feature: "Pain Points", observer: "Top 5", insider: "Full", syndicate: "Full + JTBD" },
  { feature: "Go/No-Go Decision", observer: true, insider: true, syndicate: true },
  { feature: "Strategic Roadmap", observer: false, insider: true, syndicate: true },
  { feature: "Week-by-Week Plan", observer: false, insider: true, syndicate: true },
  { feature: "Risk Mitigation", observer: false, insider: "5 key", syndicate: "Full matrix" },
  { feature: "Figma Prompts", observer: false, insider: false, syndicate: "10 prompts" },
  { feature: "AI Toolkit Guide", observer: false, insider: false, syndicate: true },
  { feature: "Success Metrics", observer: false, insider: false, syndicate: true },
  { feature: "Delivery", observer: "24h", insider: "48h", syndicate: "72h" },
  { feature: "Output Length", observer: "1-2 pages", insider: "5-8 pages", syndicate: "15-20 pages" },
];
