import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  analysisSessions, InsertAnalysisSession, AnalysisSession,
  purchases, InsertPurchase, Purchase,
  analysisResults, InsertAnalysisResult, AnalysisResult,
  adminWallets, InsertAdminWallet, AdminWallet,
  usedSignatures, InsertUsedSignature,
  emailSubscribers, InsertEmailSubscriber, EmailSubscriber,
  adminChallenges, InsertAdminChallenge, AdminChallenge,
  processedWebhooks, InsertProcessedWebhook, ProcessedWebhook,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "walletAddress"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ ANALYSIS SESSION FUNCTIONS ============

export async function createAnalysisSession(session: InsertAnalysisSession): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(analysisSessions).values(session);
}

export async function getAnalysisSessionById(sessionId: string): Promise<AnalysisSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(analysisSessions).where(eq(analysisSessions.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAnalysisSessionStatus(sessionId: string, status: AnalysisSession["status"]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analysisSessions).set({ status }).where(eq(analysisSessions.sessionId, sessionId));
}

export async function getAnalysisSessionsByUserId(userId: number): Promise<AnalysisSession[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(analysisSessions).where(eq(analysisSessions.userId, userId)).orderBy(desc(analysisSessions.createdAt));
}

// ============ PURCHASE FUNCTIONS ============

export async function createPurchase(purchase: InsertPurchase): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(purchases).values(purchase);
}

export async function getPurchaseBySessionId(sessionId: string): Promise<Purchase | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(purchases).where(eq(purchases.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPurchaseByStripePaymentIntent(paymentIntentId: string): Promise<Purchase | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(purchases).where(eq(purchases.stripePaymentIntentId, paymentIntentId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPurchaseByCoinbaseChargeId(chargeId: string): Promise<Purchase | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(purchases).where(eq(purchases.coinbaseChargeId, chargeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updatePurchaseStatus(sessionId: string, status: Purchase["paymentStatus"], completedAt?: Date): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<Purchase> = { paymentStatus: status };
  if (completedAt) updateData.completedAt = completedAt;
  await db.update(purchases).set(updateData).where(eq(purchases.sessionId, sessionId));
}

export async function getPurchasesByUserId(userId: number): Promise<Purchase[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(purchases).where(eq(purchases.userId, userId)).orderBy(desc(purchases.createdAt));
}

export async function getAllPurchases(): Promise<Purchase[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
}

// ============ ANALYSIS RESULT FUNCTIONS ============

export async function createAnalysisResult(result: InsertAnalysisResult): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(analysisResults).values(result);
}

export async function getAnalysisResultBySessionId(sessionId: string): Promise<AnalysisResult | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(analysisResults).where(eq(analysisResults.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAnalysisResult(sessionId: string, data: Partial<InsertAnalysisResult>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analysisResults).set(data).where(eq(analysisResults.sessionId, sessionId));
}

// Progress tracking for APEX real-time updates
export type ProgressStatus = "pending" | "in_progress" | "completed" | "failed";

export interface PartProgress {
  partNum: 1 | 2 | 3 | 4;
  status: ProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
}

export async function updateAnalysisPartProgress(
  sessionId: string,
  partNum: 1 | 2 | 3 | 4,
  status: ProgressStatus,
  timestamp?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = timestamp || new Date();
  const updateData: Record<string, unknown> = {
    currentPart: partNum,
    [`part${partNum}Status`]: status,
  };

  if (status === "in_progress") {
    updateData[`part${partNum}StartedAt`] = now;
  } else if (status === "completed" || status === "failed") {
    updateData[`part${partNum}CompletedAt`] = now;
  }

  await db.update(analysisResults).set(updateData).where(eq(analysisResults.sessionId, sessionId));
}

export async function setEstimatedCompletion(sessionId: string, estimatedAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(analysisResults).set({ estimatedCompletionAt: estimatedAt }).where(eq(analysisResults.sessionId, sessionId));
}

export async function getAnalysisResultsByUserId(userId: number): Promise<AnalysisResult[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(analysisResults).where(eq(analysisResults.userId, userId)).orderBy(desc(analysisResults.createdAt));
}

// ============ ADMIN WALLET FUNCTIONS ============

export async function getAdminWallets(): Promise<AdminWallet[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(adminWallets).where(eq(adminWallets.isActive, true));
}

export async function isAdminWallet(address: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(adminWallets)
    .where(and(eq(adminWallets.walletAddress, address.toLowerCase()), eq(adminWallets.isActive, true)))
    .limit(1);
  return result.length > 0;
}

export async function addAdminWallet(wallet: InsertAdminWallet): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(adminWallets).values({ ...wallet, walletAddress: wallet.walletAddress.toLowerCase() });
}

// ============ SIGNATURE FUNCTIONS (Replay Prevention) ============

export async function isSignatureUsed(signature: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(usedSignatures).where(eq(usedSignatures.signature, signature)).limit(1);
  return result.length > 0;
}

export async function markSignatureUsed(signature: string, walletAddress: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(usedSignatures).values({ signature, walletAddress: walletAddress.toLowerCase() });
}

// ============ ADMIN CHALLENGE FUNCTIONS (DoS-resistant) ============

export async function storeChallenge(
  walletAddress: string,
  challenge: string,
  timestamp: number,
  expiresAt: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedAddress = walletAddress.toLowerCase();

  // Upsert: replace existing challenge for this wallet
  await db.insert(adminChallenges)
    .values({ walletAddress: normalizedAddress, challenge, timestamp, expiresAt })
    .onDuplicateKeyUpdate({
      set: { challenge, timestamp, expiresAt }
    });
}

export async function getChallenge(walletAddress: string): Promise<AdminChallenge | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select()
    .from(adminChallenges)
    .where(eq(adminChallenges.walletAddress, walletAddress.toLowerCase()))
    .limit(1);

  return result[0] || null;
}

export async function deleteChallenge(walletAddress: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(adminChallenges)
    .where(eq(adminChallenges.walletAddress, walletAddress.toLowerCase()));
}

export async function cleanupExpiredChallengesDb(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = Date.now();
  const result = await db.delete(adminChallenges)
    .where(sql`${adminChallenges.expiresAt} < ${now}`);

  return (result as any).affectedRows || 0;
}

// ============ STATS FUNCTIONS ============

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const completedPurchases = await db.select().from(purchases).where(eq(purchases.paymentStatus, "completed"));

  let totalRevenueUsd = 0;
  let totalRevenueCrypto = 0;
  let countStandard = 0;
  let countMedium = 0;
  let countFull = 0;

  for (const p of completedPurchases) {
    totalRevenueUsd += parseFloat(p.amountUsd as string) || 0;
    if (p.amountCrypto) {
      totalRevenueCrypto += parseFloat(p.amountCrypto as string) || 0;
    }
    if (p.tier === "standard") countStandard++;
    else if (p.tier === "medium") countMedium++;
    else if (p.tier === "full") countFull++;
  }

  const allPurchases = await db.select().from(purchases);
  const pendingCount = allPurchases.filter(p => p.paymentStatus === "pending").length;
  const completedCount = completedPurchases.length;

  // Count by payment method
  let stripeCount = 0;
  let nowpaymentsCount = 0;
  for (const p of completedPurchases) {
    if (p.paymentMethod === "stripe") stripeCount++;
    else if (p.paymentMethod === "nowpayments" || p.paymentMethod === "coinbase") nowpaymentsCount++;
  }

  // Get session count for funnel
  const allSessions = await db.select().from(analysisSessions);

  return {
    totalRevenueUsd,
    totalRevenueCrypto,
    totalPurchases: completedCount,
    tierDistribution: {
      standard: countStandard,
      medium: countMedium,
      full: countFull,
    },
    paymentMethodDistribution: {
      stripe: stripeCount,
      nowpayments: nowpaymentsCount,
    },
    conversionFunnel: {
      sessions: allSessions.length,
      payments: allPurchases.length,
      completed: completedCount,
    },
  };
}

export async function getTransactionHistory(limit = 100): Promise<Purchase[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(limit);
}

// ============ WEBHOOK IDEMPOTENCY FUNCTIONS ============

/**
 * Check if a webhook has already been processed (prevents double-spend)
 */
export async function isWebhookProcessed(webhookId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select()
    .from(processedWebhooks)
    .where(eq(processedWebhooks.webhookId, webhookId))
    .limit(1);

  return result.length > 0;
}

/**
 * Atomically check and mark a webhook as processed
 * Returns true if this is the first time processing (should continue)
 * Returns false if already processed (should skip)
 * This prevents race conditions by using INSERT with unique constraint
 */
export async function tryMarkWebhookProcessed(
  webhookId: string,
  paymentProvider: string,
  sessionId: string,
  paymentId?: string,
  status: string = "completed"
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[Webhook] Database not available - cannot ensure idempotency");
    // Return false to prevent processing without idempotency guarantee
    return false;
  }

  try {
    await db.insert(processedWebhooks).values({
      webhookId,
      paymentProvider,
      sessionId,
      paymentId,
      status,
    });
    // Insert succeeded - this is the first time processing
    return true;
  } catch (error: any) {
    // If unique constraint violation, webhook was already processed
    if (error.code === "ER_DUP_ENTRY" || error.message?.includes("Duplicate entry")) {
      console.log(`[Webhook] Duplicate webhook ID detected (idempotency): ${webhookId}`);
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Mark a webhook as processed (legacy function for backward compatibility)
 * @deprecated Use tryMarkWebhookProcessed for atomic idempotency
 */
export async function markWebhookProcessed(
  webhookId: string,
  paymentProvider: string,
  sessionId: string,
  paymentId?: string,
  status: string = "completed"
): Promise<void> {
  await tryMarkWebhookProcessed(webhookId, paymentProvider, sessionId, paymentId, status);
}

// ============ EMAIL SUBSCRIBER FUNCTIONS ============

export async function saveEmailSubscriber(
  email: string,
  source: string = "demo_gate",
  verificationToken?: string
): Promise<{ success: boolean; isNew: boolean; subscriberId?: number; isVerified?: boolean }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save email subscriber: database not available");
    return { success: false, isNew: false };
  }

  try {
    // Check if email already exists
    const existing = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)).limit(1);

    if (existing.length > 0) {
      // Email already exists, return with verification status
      return {
        success: true,
        isNew: false,
        subscriberId: existing[0].id,
        isVerified: existing[0].isVerified
      };
    }

    // Insert new subscriber with verification token
    const result = await db.insert(emailSubscribers).values({
      email,
      source,
      verificationToken,
      verificationSentAt: verificationToken ? new Date() : undefined,
      isVerified: false,
    });

    // Get the inserted subscriber ID
    const newSubscriber = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)).limit(1);
    const subscriberId = newSubscriber[0]?.id;

    return { success: true, isNew: true, subscriberId, isVerified: false };
  } catch (error) {
    console.error("[Database] Error saving email subscriber:", error);
    return { success: false, isNew: false };
  }
}

export async function verifyEmailSubscriber(token: string): Promise<{ success: boolean; email?: string }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot verify email subscriber: database not available");
    return { success: false };
  }

  try {
    // Find subscriber by verification token
    const subscriber = await db.select().from(emailSubscribers)
      .where(eq(emailSubscribers.verificationToken, token))
      .limit(1);

    if (subscriber.length === 0) {
      return { success: false };
    }

    // Update subscriber as verified
    await db.update(emailSubscribers)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
        verificationToken: null // Clear token after use
      })
      .where(eq(emailSubscribers.id, subscriber[0].id));

    return { success: true, email: subscriber[0].email };
  } catch (error) {
    console.error("[Database] Error verifying email subscriber:", error);
    return { success: false };
  }
}

export async function getEmailSubscriberByEmail(email: string): Promise<EmailSubscriber | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllEmailSubscribers(): Promise<EmailSubscriber[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailSubscribers).where(eq(emailSubscribers.isActive, true)).orderBy(desc(emailSubscribers.subscribedAt));
}

export async function getEmailSubscriberCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(emailSubscribers).where(eq(emailSubscribers.isActive, true));
  return result.length;
}

// ============ DEMO ANALYSIS FUNCTIONS ============

// Hardcoded demo analysis fallback content
const DEMO_ANALYSIS_FALLBACK: AnalysisResult = {
  id: 1,
  sessionId: 'demo-session',
  userId: null,
  tier: 'full',
  problemStatement: 'Build an AI-powered product validation platform that helps early-stage founders and product managers validate their ideas before investing time and resources in building.',
  singleResult: null,
  totalTokens: null,
  currentPart: 6,
  part1Status: 'completed',
  part2Status: 'completed',
  part3Status: 'completed',
  part4Status: 'completed',
  part5Status: 'completed',
  part6Status: 'completed',
  part1StartedAt: null,
  part1CompletedAt: null,
  part2StartedAt: null,
  part2CompletedAt: null,
  part3StartedAt: null,
  part3CompletedAt: null,
  part4StartedAt: null,
  part4CompletedAt: null,
  part5StartedAt: null,
  part5CompletedAt: null,
  part6StartedAt: null,
  part6CompletedAt: null,
  estimatedCompletionAt: null,
  generatedAt: new Date(),
  createdAt: new Date(),
  fullMarkdown: `# APEX Strategic Analysis: SaaS Product Validation Platform

## Executive Summary

This comprehensive analysis validates the market opportunity for an AI-powered product validation platform targeting early-stage founders and product managers. Our multi-agent analysis reveals strong market fundamentals with a $4.2B TAM, clear competitive positioning opportunities, and validated user demand for pre-build validation tools.

### Key Findings
- **Market Opportunity**: $4.2B TAM with 23% CAGR in no-code/validation tools
- **Target ICP**: Technical founders (25-40) building B2B SaaS, pre-seed to Series A
- **Pricing Sweet Spot**: $49-199 per analysis (validated through competitive benchmarking)
- **Primary Differentiator**: AI-native analysis with actionable Figma-ready deliverables

---

## Validated Market Opportunity

The product validation market sits at the intersection of three growing trends:
1. **Rise of solo founders** - 62% increase in solo-founded startups since 2020
2. **Cost of failure** - Average failed startup burns $150K before pivot/shutdown
3. **AI-native tools adoption** - 78% of founders actively using AI in their workflow`,

  part1: `# Part 1: Discovery & Problem Analysis

## Problem Space Deep Dive

### The Core Problem
Founders waste an average of 6-12 months and $50K-150K building products nobody wants. The validation process is:
- **Time-consuming**: Traditional user research takes 4-8 weeks
- **Expensive**: Hiring consultants costs $10K-50K minimum
- **Subjective**: Gut-feel decisions lead to 90% startup failure rate

### User Needs Analysis
Through analysis of 500+ ProductHunt launches and founder communities:

| Need Category | Pain Level (1-10) | Current Solutions | Gap |
|--------------|-------------------|-------------------|-----|
| Idea Validation | 9/10 | Surveys, MVPs | No AI synthesis |
| Market Sizing | 8/10 | Manual research | Outdated data |
| Competitor Analysis | 7/10 | SEMrush, Crunchbase | No insights layer |
| UI/UX Direction | 9/10 | Hiring designers | Expensive, slow |

### Target User Persona

**Primary Persona: "Technical Tyler"**
- Age: 28-35
- Role: Full-stack developer turned founder
- Budget: $100-500/month for tools
- Pain: "I can build anything, but what should I build?"
- Goal: Validate ideas before writing code

**Secondary Persona: "PM Patricia"**
- Age: 30-40  
- Role: Senior PM at growth-stage startup
- Budget: Company card with $1K/month discretionary
- Pain: "Leadership wants data, not opinions"
- Goal: Build business cases for new features`,

  part2: `# Part 2: Competitor Deep-Dive

## Competitive Landscape Analysis

### Direct Competitors

#### 1. Gummysearch ($29-99/mo)
**Strengths:**
- Reddit-focused audience research
- Clean UI, good onboarding
- Strong SEO presence

**Weaknesses:**
- Limited to Reddit data only
- No synthesis or recommendations
- Manual analysis required

**Our Advantage:** Multi-source synthesis with AI insights

---

#### 2. SparkToro ($50-150/mo)
**Strengths:**
- Audience intelligence platform
- Integration ecosystem
- Enterprise credibility

**Weaknesses:**
- Marketing-focused, not validation
- Expensive for individual founders
- No actionable deliverables

**Our Advantage:** Founder-focused with implementation-ready outputs

---

#### 3. Wynter ($199+/mo)
**Strengths:**
- B2B message testing
- Panel quality
- Result turnaround

**Weaknesses:**
- Message testing only
- High minimum price
- Requires existing copy/product

**Our Advantage:** Pre-build validation, not post-build testing

### Competitive Positioning Matrix

\`\`\`
              AI-Native
                 ↑
                 |  [US] ★
    SparkToro   |          
         •      |      
─────────────●──Gummysearch───→ Founder-Focused
         Wynter |      
                |
              Legacy
\`\`\`

### Pricing Benchmarks

| Competitor | Entry Price | Pro Price | Enterprise |
|------------|-------------|-----------|------------|
| Gummysearch | $29/mo | $99/mo | Custom |
| SparkToro | $50/mo | $150/mo | $300+/mo |
| Wynter | $199/survey | N/A | Custom |
| **[Our Position]** | **$49/analysis** | **$99/analysis** | **$199/analysis** |`,

  part3: `# Part 3: Strategic Roadmap

## Phase-by-Phase Implementation Plan

### Phase 1: MVP Launch (Weeks 1-4)
**Goal:** Validate core value proposition with 100 paying customers

**Deliverables:**
- [ ] Landing page with clear value prop
- [ ] Single-tier offering ($49 Observer)
- [ ] Core AI analysis pipeline (Part 1 only)
- [ ] Email delivery system
- [ ] Basic payment integration (Stripe)

**Success Metrics:**
- 100 paying customers
- 4.0+ satisfaction score
- <24hr delivery time

---

### Phase 2: Feature Expansion (Weeks 5-8)
**Goal:** Add premium tiers and expand analysis depth

**Deliverables:**
- [ ] Multi-tier pricing (Observer $49, Insider $99, Syndicate $199)
- [ ] All 6 analysis parts
- [ ] Dashboard for result viewing
- [ ] PDF export functionality
- [ ] Figma prompt library

**Success Metrics:**
- 40% choose Insider or higher
- $15K MRR
- 10% organic referral rate

---

### Phase 3: Scale & Optimize (Weeks 9-12)
**Goal:** Achieve product-market fit signals

**Deliverables:**
- [ ] User accounts & history
- [ ] Team collaboration features
- [ ] API access for power users
- [ ] White-label partnerships
- [ ] Content marketing engine

**Success Metrics:**
- $50K MRR
- <5% churn
- NPS 50+

## Tech Stack Recommendation

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + Vite | Fast iteration, modern DX |
| Backend | Node.js + Express | TypeScript consistency |
| Database | PostgreSQL | Relational needs, Supabase |
| AI | Perplexity API | Real-time research synthesis |
| Payments | Stripe + Crypto | Flexibility for global users |
| Email | Resend | Developer-friendly transactional |`,

  part4: `# Part 4: 5 Core Design Prompts

## Prompt 1: Hero Landing Section
**Screen:** Homepage Above-Fold
**Purpose:** Convert visitors into leads with immediate value clarity

\`\`\`
Create a SaaS landing page hero section with these specifications:

LAYOUT:
- Full viewport height (100vh) with subtle gradient background
- Split layout: 60% content left, 40% visual right
- Floating navigation bar with blur backdrop

CONTENT HIERARCHY:
1. Trust badge: "Trusted by 500+ founders" with avatar stack
2. Main headline: "Validate Before You Build" (48px, bold)
3. Subheadline: "AI-powered analysis in 24 hours" (20px, light)
4. CTA: Primary button "Start Analysis" (gradient, 48px height)
5. Secondary: "See Demo" link

VISUAL ELEMENTS:
- Right side: Animated dashboard preview mockup
- Floating cards showing analysis snippets
- Subtle grid background pattern

COLORS:
- Background: #0a0a0b to #121214 gradient
- Primary: #6366f1 (Indigo)
- Text: #f9fafb (main) / #9ca3af (muted)
\`\`\`

---

## Prompt 2: Pricing Tier Cards
**Screen:** Pricing Section
**Purpose:** Guide users to premium tiers with clear value differentiation

\`\`\`
Design a 3-tier pricing comparison with these specifications:

LAYOUT:
- Horizontal card layout on desktop (grid-cols-3)
- Card dimensions: 380px width, auto height
- Middle card elevated (scale-105) with "Popular" badge

TIER STRUCTURE:
1. Observer ($49) - "Quick validation for side projects"
   - 1-part analysis (single API call), Email delivery, 48hr turnaround
   
2. Insider ($99) - "Full analysis for serious founders" [POPULAR]
   - 2-part analysis, Dashboard access, 24hr turnaround
   - Competitor deep-dive, Strategic roadmap
   
3. Syndicate ($199) - "Complete package for funded teams"
   - 6-part analysis, Priority support, 12hr turnaround
   - 10 Figma prompts, ROI calculator, Team sharing

VISUAL TREATMENT:
- Observer: Muted border, basic styling
- Insider: Gradient border, glow effect, highlighted
- Syndicate: Dark premium styling, gold accents

MICRO-INTERACTIONS:
- Hover: Slight lift (translateY -4px) + shadow increase
- Feature tooltips on hover
\`\`\`

---

## Prompt 3: Analysis Dashboard
**Screen:** User Dashboard
**Purpose:** Display analysis results with professional data visualization

\`\`\`
Create a comprehensive analysis dashboard with:

STRUCTURE:
- Left sidebar: Navigation + user profile
- Main area: Tabbed content sections
- Top bar: Breadcrumb + action buttons (Export, Share)

NAVIGATION TABS:
1. Overview - Executive summary with key metrics
2. Market Analysis - Charts and competitor data
3. Strategy - Roadmap timeline visualization
4. Deliverables - Figma prompts and downloads

KEY COMPONENTS:
- Metric cards with sparkline trends
- Competitive positioning matrix (interactive)
- Roadmap Gantt chart
- Collapsible sections with markdown rendering

DATA VISUALIZATION:
- TAM/SAM/SOM concentric circles
- Competitor radar chart
- Risk assessment heatmap
\`\`\`

---

## Prompt 4: Analysis Result View
**Screen:** Single Analysis View
**Purpose:** Present long-form content in digestible format

\`\`\`
Design a long-form content reader with:

READING EXPERIENCE:
- Max-width: 720px for optimal line length
- Typography: 18px body, 1.75 line height
- Generous paragraph spacing (24px)

NAVIGATION:
- Sticky table of contents (left sidebar on desktop)
- Progress indicator (top bar)
- Floating "Back to top" button

CONTENT RENDERING:
- Markdown support with custom styling
- Code blocks with syntax highlighting
- Tables with alternating row colors
- Blockquotes with left border accent

ACTIONS:
- Copy individual sections
- Export to PDF
- Share specific sections via link
\`\`\`

---

## Prompt 5: Checkout Flow
**Screen:** Payment Process
**Purpose:** Minimize friction in conversion with trust signals

\`\`\`
Create a checkout experience with:

LAYOUT:
- 2-column: Form (60%) + Order Summary (40%)
- Mobile: Stacked with sticky summary at top

ORDER SUMMARY (Right):
- Selected tier with price
- Feature checklist (3-5 key items)
- Guarantee badge: "24-hour delivery or free"
- Total with any discounts applied

PAYMENT FORM (Left):
- Email input (pre-filled if known)
- Payment method tabs: Card / Crypto
- Card form with inline validation
- Crypto: Wallet connect options

TRUST ELEMENTS:
- SSL badge
- "256-bit encryption" text
- Payment processor logos
- Money-back guarantee

POST-PAYMENT:
- Success animation
- Clear next steps
- Email confirmation preview
\`\`\``,

  part5: `# Part 5: 5 Advanced Design Prompts

## Prompt 6: Empty State - No Analyses Yet
**Screen:** Dashboard (First Visit)
**Purpose:** Guide new users toward their first analysis

\`\`\`
Design an empty state that converts visitors to users:

VISUAL:
- Centered illustration: Abstract analysis/chart graphic
- Subtle animation: Floating elements or pulsing dots

CONTENT:
- Headline: "Your Dashboard Awaits"
- Body: "Start your first analysis to unlock insights"
- CTA: "Begin First Analysis" (primary button)
- Secondary: "Watch Demo" (ghost button)

SUPPORTING ELEMENTS:
- 3 small cards showing what they'll get:
  1. "Market Analysis" - chart icon
  2. "Competitor Intel" - radar icon
  3. "Action Plan" - checklist icon

MICRO-COPY:
- "Takes 2 minutes to submit"
- "Results in 24 hours"
\`\`\`

---

## Prompt 7: Error State - Payment Failed
**Screen:** Checkout Error
**Purpose:** Recover failed transactions with clear guidance

\`\`\`
Design a payment failure state with:

VISUAL:
- Warning icon (amber, not red - less alarming)
- Card illustration with "declined" indicator

CONTENT:
- Headline: "Payment Couldn't Be Processed"
- Body: Specific reason if available
- Recovery options as buttons

RECOVERY FLOW:
1. "Try Again" - Primary CTA
2. "Use Different Card" - Secondary
3. "Pay with Crypto" - Alternative
4. "Contact Support" - Text link

TRUST MAINTENANCE:
- "Your information is secure"
- "Common reasons for decline" expandable
- Live chat widget prompt

DESIGN NOTES:
- Don't use red (too alarming)
- Show that progress is saved
- No loss of entered data
\`\`\`

---

## Prompt 8: Loading State - Analysis Processing
**Screen:** Processing Overlay/Page
**Purpose:** Reduce perceived wait time with engaging progress

\`\`\`
Create an analysis processing state with:

PROGRESS VISUALIZATION:
- Step indicator showing current phase:
  1. "Analyzing market..." 
  2. "Researching competitors..."
  3. "Building strategy..."
  4. "Generating deliverables..."
  5. "Finalizing report..."

ANIMATIONS:
- Current step: Pulsing dot + progress bar
- Completed: Checkmark with subtle bounce
- Pending: Muted, waiting state

ENGAGEMENT ELEMENTS:
- Random tips carousel: "Did you know..."
- Estimated time remaining
- Fun facts about their industry

TECHNICAL:
- SSE/WebSocket updates for real progress
- Fallback polling every 10 seconds
- Graceful timeout handling (show contact support)
\`\`\`

---

## Prompt 9: Mobile Navigation
**Screen:** Mobile App Shell
**Purpose:** Thumb-friendly navigation for mobile users

\`\`\`
Design a mobile navigation system with:

BOTTOM TAB BAR:
- 4 items max: Home, Analyses, Create, Profile
- Active state: Filled icon + label
- Inactive: Outline icon only
- Safe area padding for modern devices

GESTURES:
- Swipe between main sections
- Pull-to-refresh on lists
- Swipe-to-reveal actions on cards

HEADER:
- Collapsible on scroll
- Search accessible via icon
- Notification bell with badge

SHEET PATTERNS:
- Bottom sheets for filters/options
- Full-screen for creation flows
- Half-sheet for quick actions
\`\`\`

---

## Prompt 10: Destructive Action Modal
**Screen:** Delete Confirmation
**Purpose:** Prevent accidents while respecting user intent

\`\`\`
Design a delete confirmation modal with:

STRUCTURE:
- Centered modal with backdrop blur
- Max-width: 400px
- Warning icon at top

CONTENT:
- Headline: "Delete This Analysis?"
- Body: What exactly will be deleted
- Consequence: "This cannot be undone"

ACTIONS:
- "Cancel" - Ghost/secondary (left)
- "Delete" - Destructive/red (right)

SAFEGUARDS:
- For high-value: Require typing "DELETE"
- Brief cooling period (button disabled 2s)
- Show what will be preserved (if anything)

ACCESSIBILITY:
- Focus trap within modal
- Escape key closes
- Red not sole indicator (add icon)
\`\`\``,

  part6: `# Part 6: Risk, Metrics & ROI

## Risk Assessment Matrix

### High Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI output quality inconsistency | Medium | High | Human review layer, iterative prompting |
| Competitor launches similar tool | High | Medium | Speed to market, build brand early |
| API cost overruns | Medium | Medium | Usage caps, tiered pricing |
| Low initial conversion | Medium | High | Heavy demo investment, social proof |

### Medium Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Customer support overload | Medium | Medium | Self-serve docs, chatbot layer |
| Payment fraud | Low | Medium | Stripe Radar, crypto verification |
| SEO competition | High | Low | Focus on community/word-of-mouth |

---

## Success Metrics Framework

### North Star Metric
**Analyses Completed per Week** - Primary indicator of value delivery

### Supporting Metrics

**Acquisition:**
- Website visitors → Trial starts (target: 5%)
- Trial → Paid conversion (target: 15%)
- CAC target: <$50

**Activation:**
- Time to first analysis: <5 minutes
- First analysis completion rate: >80%

**Revenue:**
- MRR growth: 20% month-over-month
- Average revenue per user: $85
- Tier distribution: 40% Observer, 40% Insider, 20% Syndicate

**Retention:**
- 30-day repurchase rate: 25%
- 90-day repurchase rate: 40%
- NPS: 50+

---

## ROI Justification

### For the Founder (Our Customer)

**Without Our Tool:**
- 4-8 weeks of manual research: $5,000 opportunity cost
- Hiring consultant: $10,000+
- Building wrong product: $50,000-$150,000

**With Our Tool:**
- Investment: $49-$199 (one-time)
- Time saved: 40+ hours
- Avoided mistakes: Priceless

**ROI Calculation:**
\`\`\`
Conservative estimate:
- Hours saved: 40 hours × $100/hr = $4,000
- Tool cost: $99
- ROI: 4,040% (40x return)
\`\`\`

### For Our Business

**Unit Economics (Per Analysis):**
- Revenue: $99 (average)
- AI costs: $15 (Perplexity + OpenAI)
- Processing: $2
- Payment fees: $3
- **Gross margin: $79 (80%)**

**Path to $1M ARR:**
- Required analyses/month: 840
- At 40% repurchase: 600 new customers/month
- With 5% conversion: 12,000 visitors/month
- Achievable with SEO + community + ads

---

## Appendix: Implementation Checklist

### Week 1
- [ ] Landing page live
- [ ] Payment integration
- [ ] Basic AI pipeline
- [ ] Email delivery

### Week 2
- [ ] First 10 paying customers
- [ ] Feedback collection
- [ ] Bug fixes

### Week 3-4
- [ ] Iterate on AI prompts
- [ ] Add dashboard view
- [ ] Launch ProductHunt

### Month 2
- [ ] Multi-tier pricing
- [ ] All 6 parts live
- [ ] 100 customers

### Month 3
- [ ] $15K MRR target
- [ ] Team features beta
- [ ] API development start`,
};

export async function getDemoAnalysisResult(): Promise<AnalysisResult | undefined> {
  try {
    const db = await getDb();
    if (!db) {
      // Return hardcoded fallback when no database
      return DEMO_ANALYSIS_FALLBACK;
    }

    // Get demo session ID from env var with safe fallback
    const demoSessionId = process.env.DEMO_SESSION_ID || 'test-apex-demo-LAIdJqey';

    // Get the demo analysis result by session ID
    const result = await db.select().from(analysisResults).where(eq(analysisResults.sessionId, demoSessionId)).limit(1);
    if (result.length > 0) return result[0];

    // Fallback: try demo-session or first result by ID
    const fallback = await db.select().from(analysisResults).where(eq(analysisResults.sessionId, 'demo-session')).limit(1);
    if (fallback.length > 0) return fallback[0];

    const lastFallback = await db.select().from(analysisResults).orderBy(analysisResults.id).limit(1);
    if (lastFallback.length > 0) return lastFallback[0];

    // Ultimate fallback: return hardcoded demo content
    return DEMO_ANALYSIS_FALLBACK;
  } catch (error) {
    console.error('getDemoAnalysisResult error, returning fallback:', error);
    // On any database error, return the hardcoded fallback
    return DEMO_ANALYSIS_FALLBACK;
  }
}

