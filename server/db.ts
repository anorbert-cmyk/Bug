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
  let coinbaseCount = 0;
  for (const p of completedPurchases) {
    if (p.paymentMethod === "stripe") stripeCount++;
    else if (p.paymentMethod === "coinbase") coinbaseCount++;
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
      coinbase: coinbaseCount,
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
 * Mark a webhook as processed (atomic operation to prevent race conditions)
 */
export async function markWebhookProcessed(
  webhookId: string,
  paymentProvider: string,
  sessionId: string,
  paymentId?: string,
  status: string = "completed"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.insert(processedWebhooks).values({
      webhookId,
      paymentProvider,
      sessionId,
      paymentId,
      status,
    });
  } catch (error: any) {
    // If unique constraint violation, webhook was already processed
    if (error.code === "ER_DUP_ENTRY") {
      console.log(`[Webhook] Duplicate webhook ID detected (idempotency): ${webhookId}`);
      return;
    }
    throw error;
  }
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

export async function getDemoAnalysisResult(): Promise<AnalysisResult | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // Get the demo analysis result by session ID
  const result = await db.select().from(analysisResults).where(eq(analysisResults.sessionId, 'test-apex-demo-LAIdJqey')).limit(1);
  if (result.length > 0) return result[0];
  // Fallback: try demo-session or first result by ID
  const fallback = await db.select().from(analysisResults).where(eq(analysisResults.sessionId, 'demo-session')).limit(1);
  if (fallback.length > 0) return fallback[0];
  const lastFallback = await db.select().from(analysisResults).orderBy(analysisResults.id).limit(1);
  return lastFallback.length > 0 ? lastFallback[0] : undefined;
}
