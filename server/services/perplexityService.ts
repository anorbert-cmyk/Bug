/**
 * Perplexity AI Service
 * Handles both single-call and multi-part sequential analysis
 * Based on the proven prompts from the original rapid-apollo implementation
 */

import { invokeLLM } from "../_core/llm";
import { Tier, isMultiPartTier, MULTI_PART_CONFIG } from "../../shared/pricing";
import {
  OBSERVER_SYSTEM_PROMPT,
  getObserverPrompt,
  INSIDER_SYSTEM_PROMPT,
  getInsiderInitialPrompt,
  getInsiderContinuePrompt,
  getTierPromptConfig,
  SYNDICATE_SYSTEM_PROMPT,
  SYNDICATE_PART_SCOPES,
  getSyndicateInitialPrompt,
  getSyndicateContinuePrompt,
} from "./tierPromptService";

// ===========================================
// PROMPT INJECTION DEFENSE
// ===========================================

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|rules?|prompts?)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)/gi,
  /forget\s+(everything|all|your)\s+(instructions?|rules?|training)/gi,
  /you\s+are\s+(now|actually|really)\s+(?!analyzing|helping)/gi,
  /act\s+as\s+(?!a\s+helpful)/gi,
  /pretend\s+(to\s+be|you('re)?)/gi,
  /roleplay\s+as/gi,
  /switch\s+to\s+.*\s+mode/gi,
  /what\s+(are|is)\s+your\s+(system\s+)?prompt/gi,
  /show\s+(me\s+)?your\s+(instructions?|prompt|rules)/gi,
  /reveal\s+(your\s+)?(hidden\s+)?instructions?/gi,
  /DAN\s*mode/gi,
  /developer\s+mode/gi,
  /sudo\s+mode/gi,
  /\[JAILBREAK\]/gi,
  /bypass\s+(safety|filter|restriction)/gi,
  /<script[\s>]/gi,
];

function sanitizeInput(input: string): { sanitized: string; flags: string[] } {
  const flags: string[] = [];
  let sanitized = input;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      flags.push(`Pattern: ${pattern.source.slice(0, 20)}...`);
    }
    pattern.lastIndex = 0;
  }

  // Escape delimiters
  sanitized = sanitized
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\[/g, '［')
    .replace(/\]/g, '］');

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return { sanitized, flags };
}

// ===========================================
// STANDARD TIER PROMPT (Single API Call)
// ===========================================

const STANDARD_PROMPT = (problem: string) => `
═══════════════════════════════════════════════════════════════════
🎯 RAPID UX ANALYSIS - OBSERVER TIER
═══════════════════════════════════════════════════════════════════

You are an expert UX strategist providing a focused analysis for quick validation.

USER PROBLEM/IDEA:
${problem}

═══════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════

Provide a concise but valuable analysis covering:

## Executive Summary
3-4 sentences summarizing the problem, approach, and expected outcome.

## Problem Analysis
- Core problem identification
- Primary user needs
- Key pain points (top 3)

## Quick Recommendations
- Immediate action items (3-5 bullet points)
- Low-hanging fruit opportunities
- Critical risks to avoid

## Next Steps
- Recommended first action
- Timeline estimate
- Success criteria

Keep the response focused and actionable. Maximum 1,500 tokens.
`;

// ===========================================
// MEDIUM TIER PROMPT (Single API Call, More Depth)
// ===========================================

const MEDIUM_PROMPT = (problem: string) => `
═══════════════════════════════════════════════════════════════════
🔍 COMPREHENSIVE UX ANALYSIS - INSIDER TIER
═══════════════════════════════════════════════════════════════════

You are an expert UX strategist providing comprehensive analysis with strategic insights.

USER PROBLEM/IDEA:
${problem}

═══════════════════════════════════════════════════════════════════
OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════════

## Executive Summary
4-5 sentences: Problem + Approach + Expected Outcome + Key Differentiator

## Problem Analysis
- **Core Problem:** Deep dive into the fundamental issue
- **Root Causes:** Identify 3-5 underlying causes
- **Impact Areas:** User, Business, Technical implications
- **Jobs-to-be-Done:** What users are trying to accomplish

## User Persona Snapshot
| Attribute | Primary User | Secondary User |
|-----------|--------------|----------------|
| Role | ... | ... |
| Goals | ... | ... |
| Pain Points | ... | ... |
| Success Criteria | ... | ... |

## Strategic Recommendations

### Immediate (24h)
- Action 1 with rationale
- Action 2 with rationale
- Action 3 with rationale

### Short-Term (1 week)
- Priority initiatives
- Quick wins to pursue
- Dependencies to address

### Long-Term (1 month+)
- Strategic initiatives
- Capability building
- Competitive positioning

## Risk Assessment
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Risk 1 | High/Med/Low | High/Med/Low | ... |
| Risk 2 | ... | ... | ... |
| Risk 3 | ... | ... | ... |

## Success Metrics
- North Star Metric
- Leading indicators (3-5)
- Lagging indicators (2-3)

## Key Insight
One powerful insight that could transform the approach.

## Recommended Next Step
Specific, actionable next step with timeline.

Maximum 3,000 tokens. Be thorough but focused.
`;

// ===========================================
// FULL TIER - MULTI-PART PROMPTS (4 Sequential API Calls)
// ===========================================

const MULTI_PART_SYSTEM_PROMPT = `You are an elite UX strategist and product consultant conducting a comprehensive 4-part strategic analysis. 

Your analysis style is:
- Data-driven and research-backed (cite sources when possible)
- Practical and implementation-focused
- Strategic yet actionable
- Clear and well-structured with tables and frameworks

You maintain context across all parts of the conversation to build a cohesive strategic analysis. Each part builds on previous insights.

IMPORTANT: Always end each part with the completion marker as specified.`;

const PART_SCOPES: Record<number, string> = {
  1: `### PART 1 – Discovery & Problem Analysis (~2,000 tokens)

OUTPUT THESE SECTIONS:

## Executive Summary
3-4 sentences: Problem + Approach + Expected Outcome

## Adaptive Problem Analysis
- **Task Type Detection:** exploratory vs. optimization
- **User Base:** B2C, B2B, internal tool, multi-stakeholder
- **Complexity Level:** Quick win 1-2 weeks / Medium 1-2 months / Strategic 3+ months
- **Key Constraints:** timeline, budget, technical, organizational, regulatory

## Core Problem Statement (JTBD lens)
- What users are trying to accomplish
- Current pain points or gaps (with VERIFIED data where possible)
- Success criteria (explicit or inferred)

## Tailored Methodology Selection (Discovery phase only)
Select from:
- User Interviews (deep motivations)
- Jobs to be Done (JTBD) framework
- Competitive Analysis (market positioning)
- Contextual Inquiry / Shadowing (for complex workflows)

For each method include: 🧠 Behind the Decision + When to apply + Expected output + User/Business/Technical impact

## Assumption Ledger
| # | Assumption | Confidence | Validation Plan | Business Risk if Wrong |
|---|------------|------------|-----------------|------------------------|
| A1 | ... | High/Med/Low | ... | ... |
| A2 | ... | ... | ... | ... |
| A3 | ... | ... | ... | ... |

**End with:** \`[✅ PART 1 COMPLETE]\``,

  2: `### PART 2 – Strategic Design & Roadmap (~2,500 tokens)

Reference insights from Part 1 naturally (e.g., "Based on Assumption A2...").

OUTPUT THESE SECTIONS:

## Tailored Methodology (Ideation & Design phase)
Select from:
- Service Blueprinting (backend/frontend alignment)
- Dual-Path Information Architecture (if multi-audience)
- User Journey Mapping (end-to-end experience)
- Error Path Mapping (failure modes & recovery)
- Wireframing → Prototyping spectrum

For each: 🧠 Rationale + User/Business/Technical impact

## Phase-by-Phase Roadmap
| Week | Phase | Key Activities | Deliverables | Decision Points |
|------|-------|----------------|--------------|-----------------|
| 1-2 | Discovery | ... | ... | ... |
| 3-4 | Define | ... | ... | ... |
| 5-7 | Design | ... | ... | ... |
| 8-9 | Validate | ... | ... | ... |
| 10 | Launch Prep | ... | ... | ... |

Include: Key milestones, team collaboration touchpoints (Figma + Miro workflows), critical dependencies

## Critical Workstream: Error Paths, Failure Modes & Recovery Flows
Identify top 5-7 failure scenarios:
- Design recovery UX for each
- Link to instrumentation/observability needs
- Include production-ready error microcopy

## "Behind the Decision" Notes
For each major phase:
- Why this approach over alternatives
- How it balances speed vs. rigor
- How it addresses business risk while maximizing user value

**End with:** \`[✅ PART 2 COMPLETE]\``,

  3: `### PART 3 – AI Toolkit, Deliverables & Figma Prompts (~2,500 tokens)

Reference the roadmap from Part 2 where relevant.

OUTPUT THESE SECTIONS:

## AI-Enhanced Execution Toolkit
| Phase | AI Tool | Use Case | Estimated Time Saved |
|-------|---------|----------|---------------------|
| Research | ChatGPT/Claude, Maze AI, Microsoft Clarity, CoNote | ... | ... |
| Design | Figma AI, UX Pilot, Miro AI | ... | ... |
| Validation | UserTesting AI, Jotform AI, A/B predictions | ... | ... |

For this task: 2-3 primary tools with exact use cases + integration workflow

## Deliverables Framework
- **Baseline:** Problem framing doc (2-3 pages), key user insights, proposed solution(s)
- **Medium Complexity:** User journey map (current vs. future), interactive Figma prototype, usability test report
- **High Complexity:** Service blueprint, design system foundations, success metrics dashboard, implementation roadmap

## 10 Production-Ready Figma AI Prompts

**Each prompt MUST include:**
- Real, production-ready microcopy (no placeholders)
- Layout specifications (grid, spacing, breakpoints)
- Accessibility requirements (WCAG AA, keyboard nav, screen reader labels)
- Error states and recovery patterns
- Rationale: User impact + Business impact + Technical feasibility

### Prompt 1: Homepage Hero (Path Detection)
Headline, subheadline, dual CTAs for audience segmentation, trust badges, scroll indicator, dark/light mode toggle, mobile responsive

### Prompt 2: Onboarding Flow
4-step progressive disclosure with form validation, WHY explanations, error recovery patterns

### Prompt 3: Dashboard Overview
Key metrics display, navigation structure, empty states, loading states

### Prompt 4: Error State – Primary Action Failed
Clear headline, explanation, "Try Again" primary CTA, secondary options, help link

### Prompt 5: Pricing Page (Transparent Tiers)
3 tiers with feature comparison table, toggle options, footer terms

### Prompt 6: Case Study / Results Page
Results metrics, strategy breakdown, testimonial, CTA

### Prompt 7: Mobile Responsive Navigation
Large touch targets (44px min), clear hierarchy, accessibility

### Prompt 8: Accessibility-First Form Components
Semantic HTML, ARIA labels, screen reader support, error states

### Prompt 9: Loading & Progress States
3-step animated progress, estimated time, cancel option, error fallback

### Prompt 10: Success Confirmation
Clear success message, next steps, share options, return navigation

**End with:** \`[✅ PART 3 COMPLETE]\``,

  4: `### PART 4 – Risk, Metrics & Strategic Rationale (~2,000 tokens)

This is the final part. Synthesize insights from Parts 1-3.

OUTPUT THESE SECTIONS:

## Team & Collaboration Model
- Recommended team composition (UX Lead, Researcher, Designer, PM, Engineering)
- Key collaboration moments and formats (Kick-off, Mid-point, Pre-launch)
- Documentation standards (Figma Dev Mode, Miro decision logs)
- If Solo Designer: Self-paced checkpoints, AI tool acceleration, async documentation

## Risk Mitigation Plan

**Common Project Risks:**
- User recruitment delays → backup: guerrilla testing
- Stakeholder misalignment → weekly workshops
- Technical constraints → early engineering review

**5 Critical UX & Product Risks (Task-Specific):**
| Risk | User Impact | Business Impact | Mitigation | Validation | Plan B |
|------|-------------|-----------------|------------|------------|--------|
| Risk 1 | ... | ... | ... | ... | ... |
| Risk 2 | ... | ... | ... | ... | ... |
| Risk 3 | ... | ... | ... | ... | ... |
| Risk 4 | ... | ... | ... | ... | ... |
| Risk 5 | ... | ... | ... | ... | ... |

## Success Metrics & Validation Plan

### Proactive Hypothesis Testing (3 Flow-Stoppers)
| Hypothesis | Risk Level | Test Method | Success Criteria | Business OKR Link |
|------------|------------|-------------|------------------|-------------------|
| H1 | High/Med/Low | A/B test, usability test, tree test | ... | ... |
| H2 | ... | ... | ... | ... |
| H3 | ... | ... | ... | ... |

### Quantitative Metrics
- Task completion rate (target: >80%)
- Time on task reduction
- Error rate decrease
- Conversion rate improvement
- Support ticket reduction

### Qualitative Metrics
- User satisfaction score (SUS, target: >70)
- Reduction in user-reported pain points

### Business OKR Alignment (3-5 linkages)
| UX Metric | Business OKR | Baseline | Timeline |
|-----------|--------------|----------|----------|
| ... | ... | ... | 30/60/90 days |

## "Behind the Decision" Layer
- Why these methods were chosen over alternatives
- How this plan balances speed vs. rigor
- How this approach addresses business risk while maximizing user value

## Final Executive Summary
3-paragraph synthesis of the entire analysis:
1. Problem & Opportunity
2. Strategic Approach & Key Recommendations
3. Expected Outcomes & Success Criteria

**End with:** \`[✅ PART 4 COMPLETE — Full UX Strategy Plan delivered across 4 parts.]\``
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function getMultiPartInitialPrompt(userProblem: string): string {
  return `
═══════════════════════════════════════════════════════════════════
🔁 EXECUTION CONTEXT (AUTOMATED MULTI-PART ANALYSIS)
═══════════════════════════════════════════════════════════════════

You are executing PART 1 of a 4-part automated UX analysis.
The backend maintains conversation context across all parts via multi-turn API calls.

USER PROBLEM/IDEA:
${userProblem}

The full solution exceeds the 8,000 token single-response limit. Output is split into 4 sequential parts with context preservation across the conversation thread.

═══════════════════════════════════════════════════════════════════
🚀 EXECUTION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════

- Output ONLY the content defined in the PART 1 scope below
- Maximum tokens: 2,000
- Maintain evidence integrity
- If content risks truncation, prioritize: Error paths > Metrics > Long prose

${PART_SCOPES[1]}

**Begin execution of PART 1 now.**
`;
}

function getMultiPartContinuePrompt(partNumber: 2 | 3 | 4): string {
  const maxTokens = partNumber === 2 || partNumber === 3 ? 2500 : 2000;

  return `
═══════════════════════════════════════════════════════════════════
Continue with PART ${partNumber} now.
═══════════════════════════════════════════════════════════════════

🚀 EXECUTION INSTRUCTIONS:
- Output ONLY the content defined in the PART ${partNumber} scope below
- Maximum tokens: ${maxTokens}
- Reference previous parts naturally (e.g., "Based on Assumption A2 from Part 1...")
- Maintain evidence integrity across all parts
- If content risks truncation, prioritize: Error paths > Metrics > Long prose

${PART_SCOPES[partNumber]}

**Begin execution of PART ${partNumber} now.**
`;
}

// ===========================================
// TYPES
// ===========================================

export interface AnalysisCallbacks {
  onChunk?: (partNumber: number, chunk: string) => void;
  onPartComplete?: (partNumber: number, content: string) => void;
  onComplete?: (result: MultiPartResult) => void;
  onError?: (error: Error) => void;
}

export interface SingleAnalysisResult {
  content: string;
  generatedAt: number;
}

export interface MultiPartResult {
  part1: string;
  part2: string;
  part3: string;
  part4: string;
  part5: string;
  part6: string;
  fullMarkdown: string;
  generatedAt: number;
}

export interface InsiderResult {
  part1: string;
  part2: string;
  fullMarkdown: string;
  generatedAt: number;
}

// ===========================================
// MAIN FUNCTIONS
// ===========================================

/**
 * Generate single-call analysis for Standard (Observer) tier
 */
export async function generateSingleAnalysis(
  problemStatement: string,
  tier: "standard" | "medium"
): Promise<SingleAnalysisResult> {
  // Sanitize input
  const { sanitized, flags } = sanitizeInput(problemStatement);
  
  if (flags.length > 0) {
    console.warn('[Perplexity] Potential prompt injection attempt detected:', flags.length, 'patterns');
  }

  // Use new tier-specific prompts
  const systemPrompt = tier === "standard" 
    ? OBSERVER_SYSTEM_PROMPT
    : INSIDER_SYSTEM_PROMPT;
  
  const userPrompt = tier === "standard"
    ? getObserverPrompt(sanitized)
    : MEDIUM_PROMPT(sanitized); // Medium tier now uses 2-part, but keep fallback

  console.log(`[Perplexity] Generating ${tier} tier analysis`);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      { 
        role: "user", 
        content: userPrompt
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : "";

  console.log(`[Perplexity] ${tier} tier analysis completed, length: ${content.length}`);

  return {
    content,
    generatedAt: Date.now(),
  };
}

/**
 * Generate 2-part sequential analysis for Insider (Medium) tier
 * Maintains conversation context across both parts
 */
export async function generateInsiderAnalysis(
  problemStatement: string,
  callbacks?: AnalysisCallbacks
): Promise<InsiderResult> {
  // Sanitize input
  const { sanitized, flags } = sanitizeInput(problemStatement);
  
  if (flags.length > 0) {
    console.warn('[Perplexity] Potential prompt injection attempt detected:', flags.length, 'patterns');
  }

  const result: InsiderResult = {
    part1: "",
    part2: "",
    fullMarkdown: "",
    generatedAt: 0,
  };

  // Conversation history to maintain context
  const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: INSIDER_SYSTEM_PROMPT },
  ];

  try {
    // Process each of the 2 parts sequentially
    for (let partNum = 1; partNum <= 2; partNum++) {
      console.log(`[Perplexity] Starting Insider Part ${partNum}/2 generation`);

      // Build the prompt for this part
      const userPrompt = partNum === 1 
        ? getInsiderInitialPrompt(sanitized)
        : getInsiderContinuePrompt(2);

      // Add user prompt to conversation history
      conversationHistory.push({ role: "user", content: userPrompt });

      // Make API call with full conversation context
      const response = await invokeLLM({
        messages: conversationHistory,
      });

      const rawContent = response.choices[0]?.message?.content;
      const partContent = typeof rawContent === "string" ? rawContent : "";

      // Store the result
      if (partNum === 1) {
        result.part1 = partContent;
      } else {
        result.part2 = partContent;
      }

      // Add assistant response to conversation history for next part
      conversationHistory.push({ role: "assistant", content: partContent });

      // Notify part completion
      callbacks?.onPartComplete?.(partNum, partContent);

      console.log(`[Perplexity] Completed Insider Part ${partNum}/2, length: ${partContent.length}`);
    }

    // Combine all parts into full markdown
    result.fullMarkdown = [
      "# 🔍 Strategic Blueprint Analysis\n",
      "---\n",
      "## Part 1: Discovery & Problem Analysis\n",
      result.part1,
      "\n---\n",
      "## Part 2: Strategic Design & Roadmap\n",
      result.part2,
    ].join("\n");

    result.generatedAt = Date.now();

    // Notify completion (convert to MultiPartResult format for compatibility)
    if (callbacks?.onComplete) {
      callbacks.onComplete({
        part1: result.part1,
        part2: result.part2,
        part3: "",
        part4: "",
        part5: "",
        part6: "",
        fullMarkdown: result.fullMarkdown,
        generatedAt: result.generatedAt,
      });
    }

    console.log(`[Perplexity] Insider analysis completed, total length: ${result.fullMarkdown.length}`);

    return result;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Perplexity] Insider analysis failed:", err);
    callbacks?.onError?.(err);
    throw err;
  }
}

/**
 * Generate multi-part sequential analysis for Full/Premium (Syndicate) tier
 * Maintains conversation context across all 6 parts for maximum content quality
 * 
 * 6-Part Structure:
 * - Part 1: Discovery & Problem Analysis (~6,000 tokens)
 * - Part 2: Competitor Deep-Dive (~6,000 tokens) - intensive Perplexity search
 * - Part 3: Strategic Roadmap (~6,000 tokens)
 * - Part 4: 5 Core Design Prompts (~7,000 tokens)
 * - Part 5: 5 Advanced Design Prompts + Edge Cases (~7,000 tokens)
 * - Part 6: Risk, Metrics & ROI (~5,000 tokens)
 * Total: ~37,000 tokens output
 */
export async function generateMultiPartAnalysis(
  problemStatement: string,
  callbacks?: AnalysisCallbacks
): Promise<MultiPartResult> {
  // Sanitize input
  const { sanitized, flags } = sanitizeInput(problemStatement);
  
  if (flags.length > 0) {
    console.warn('[Perplexity] Potential prompt injection attempt detected:', flags.length, 'patterns');
  }

  const result: MultiPartResult = {
    part1: "",
    part2: "",
    part3: "",
    part4: "",
    part5: "",
    part6: "",
    fullMarkdown: "",
    generatedAt: 0,
  };

  // Conversation history to maintain context using Syndicate-specific system prompt
  const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYNDICATE_SYSTEM_PROMPT },
  ];

  // Part titles for logging and markdown assembly
  const partTitles: Record<number, string> = {
    1: "Discovery & Problem Analysis",
    2: "Competitor Deep-Dive",
    3: "Strategic Roadmap",
    4: "5 Core Design Prompts",
    5: "5 Advanced Design Prompts + Edge Cases",
    6: "Risk, Metrics & Strategic Rationale",
  };

  try {
    // Process each of the 6 parts sequentially
    for (let partNum = 1; partNum <= 6; partNum++) {
      console.log(`[Perplexity] Starting Syndicate Part ${partNum}/6: ${partTitles[partNum]}`);

      // Build the prompt for this part using Syndicate-specific prompts
      const userPrompt = partNum === 1 
        ? getSyndicateInitialPrompt(sanitized)
        : getSyndicateContinuePrompt(partNum, extractPreviousSummary(result, partNum - 1));

      // Add user prompt to conversation history
      conversationHistory.push({ role: "user", content: userPrompt });

      // Make API call with full conversation context
      const response = await invokeLLM({
        messages: conversationHistory,
      });

      const rawContent = response.choices[0]?.message?.content;
      const partContent = typeof rawContent === "string" ? rawContent : "";

      // Store the result using dynamic key
      const partKey = `part${partNum}` as keyof Pick<MultiPartResult, "part1" | "part2" | "part3" | "part4" | "part5" | "part6">;
      result[partKey] = partContent;

      // Add assistant response to conversation history for next part
      conversationHistory.push({ role: "assistant", content: partContent });

      // Notify part completion
      callbacks?.onPartComplete?.(partNum, partContent);

      console.log(`[Perplexity] Completed Syndicate Part ${partNum}/6, length: ${partContent.length}`);
    }

    // Combine all 6 parts into full markdown
    result.fullMarkdown = [
      "# 🔥 APEX Strategic Analysis - Syndicate Tier\n",
      "---\n",
      `## Part 1: ${partTitles[1]}\n`,
      result.part1,
      "\n---\n",
      `## Part 2: ${partTitles[2]}\n`,
      result.part2,
      "\n---\n",
      `## Part 3: ${partTitles[3]}\n`,
      result.part3,
      "\n---\n",
      `## Part 4: ${partTitles[4]}\n`,
      result.part4,
      "\n---\n",
      `## Part 5: ${partTitles[5]}\n`,
      result.part5,
      "\n---\n",
      `## Part 6: ${partTitles[6]}\n`,
      result.part6,
    ].join("\n");

    result.generatedAt = Date.now();

    // Notify completion
    callbacks?.onComplete?.(result);

    console.log(`[Perplexity] Syndicate 6-part analysis completed, total length: ${result.fullMarkdown.length}`);

    return result;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Perplexity] Syndicate multi-part analysis failed:", err);
    callbacks?.onError?.(err);
    throw err;
  }
}

/**
 * Extract summary from previous parts to provide context for subsequent parts
 */
function extractPreviousSummary(result: MultiPartResult, upToPart: number): string {
  const summaries: string[] = [];
  
  // Extract key findings from each completed part
  const partKeys = ['part1', 'part2', 'part3', 'part4', 'part5'] as const;
  const partDescriptions = [
    'Discovery & Problem Analysis',
    'Competitor Deep-Dive',
    'Strategic Roadmap',
    'Core Design Prompts',
    'Advanced Design Prompts',
  ];
  
  for (let i = 0; i < upToPart && i < partKeys.length; i++) {
    const partContent = result[partKeys[i]];
    if (partContent) {
      // Extract the summary section if it exists, otherwise use first 500 chars
      const summaryMatch = partContent.match(/## (?:Key Findings Summary|Summary|Roadmap Summary|Competitor Intelligence Summary)[\s\S]*?(?=\n## |\n\[✅|$)/i);
      const summary = summaryMatch 
        ? summaryMatch[0].substring(0, 600) 
        : partContent.substring(0, 400) + '...';
      summaries.push(`**Part ${i + 1} (${partDescriptions[i]}):**\n${summary}`);
    }
  }
  
  return summaries.join('\n\n');
}

/**
 * Generate analysis based on tier
 * - Observer (standard): Single-part quick validation (~3,000 tokens)
 * - Insider (medium): 2-part strategic blueprint (~10,000 tokens)
 * - Syndicate (full): 6-part comprehensive APEX analysis (~37,000 tokens)
 */
export async function generateAnalysis(
  problemStatement: string,
  tier: Tier,
  callbacks?: AnalysisCallbacks
): Promise<SingleAnalysisResult | MultiPartResult | InsiderResult> {
  console.log(`[Perplexity] Starting ${tier} tier analysis`);
  
  switch (tier) {
    case "standard":
      // Observer tier: Single-part quick validation
      return generateSingleAnalysis(problemStatement, "standard");
    
    case "medium":
      // Insider tier: 2-part strategic blueprint
      return generateInsiderAnalysis(problemStatement, callbacks);
    
    case "full":
      // Syndicate tier: 6-part comprehensive APEX analysis
      return generateMultiPartAnalysis(problemStatement, callbacks);
    
    default:
      console.warn(`[Perplexity] Unknown tier: ${tier}, falling back to standard`);
      return generateSingleAnalysis(problemStatement, "standard");
  }
}
