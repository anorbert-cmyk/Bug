import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  walletAddress: varchar("walletAddress", { length: 42 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Analysis tiers enum
 */
export const tierEnum = mysqlEnum("tier", ["standard", "medium", "full"]);

/**
 * Payment status enum
 */
export const paymentStatusEnum = mysqlEnum("paymentStatus", ["pending", "completed", "failed", "refunded"]);

/**
 * Payment method enum
 */
export const paymentMethodEnum = mysqlEnum("paymentMethod", ["stripe", "coinbase", "paypal", "lemonsqueezy", "nowpayments"]);

/**
 * Analysis sessions - links problem statement to payment and results
 */
export const analysisSessions = mysqlTable("analysis_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId").references(() => users.id),
  email: varchar("email", { length: 320 }),
  problemStatement: text("problemStatement").notNull(),
  tier: tierEnum.notNull(),
  status: mysqlEnum("status", ["pending_payment", "processing", "completed", "failed"]).default("pending_payment").notNull(),
  // Priority tracking from email campaign
  isPriority: boolean("isPriority").default(false).notNull(),
  prioritySource: varchar("prioritySource", { length: 64 }), // e.g., "email_campaign_dec2024"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type InsertAnalysisSession = typeof analysisSessions.$inferInsert;

/**
 * Purchases/Transactions
 */
export const purchases = mysqlTable("purchases", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  userId: int("userId").references(() => users.id),
  tier: tierEnum.notNull(),
  amountUsd: decimal("amountUsd", { precision: 10, scale: 2 }).notNull(),
  amountCrypto: decimal("amountCrypto", { precision: 18, scale: 8 }),
  cryptoCurrency: varchar("cryptoCurrency", { length: 10 }),
  paymentMethod: paymentMethodEnum.notNull(),
  paymentStatus: paymentStatusEnum.default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  coinbaseChargeId: varchar("coinbaseChargeId", { length: 255 }),
  coinbaseChargeCode: varchar("coinbaseChargeCode", { length: 64 }),
  paypalOrderId: varchar("paypalOrderId", { length: 64 }),
  paypalCaptureId: varchar("paypalCaptureId", { length: 64 }),
  walletAddress: varchar("walletAddress", { length: 42 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

/**
 * Analysis progress status enum for APEX real-time tracking
 */
export const progressStatusEnum = mysqlEnum("progressStatus", ["pending", "in_progress", "completed", "failed"]);

/**
 * Analysis results - stores the AI-generated analysis
 */
export const analysisResults = mysqlTable("analysis_results", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  userId: int("userId").references(() => users.id),
  tier: tierEnum.notNull(),
  problemStatement: text("problemStatement").notNull(),
  // For standard/medium tier - single result
  singleResult: text("singleResult"),
  // For full/premium tier - 6 parts (Syndicate APEX analysis)
  part1: text("part1"),
  part2: text("part2"),
  part3: text("part3"),
  part4: text("part4"),
  part5: text("part5"),
  part6: text("part6"),
  fullMarkdown: text("fullMarkdown"),
  totalTokens: int("totalTokens"),
  // Progress tracking for APEX real-time updates
  currentPart: int("currentPart").default(0), // 0 = not started, 1-6 = current part being processed
  part1Status: progressStatusEnum.default("pending"),
  part2Status: progressStatusEnum.default("pending"),
  part3Status: progressStatusEnum.default("pending"),
  part4Status: progressStatusEnum.default("pending"),
  part5Status: progressStatusEnum.default("pending"),
  part6Status: progressStatusEnum.default("pending"),
  part1StartedAt: timestamp("part1StartedAt"),
  part1CompletedAt: timestamp("part1CompletedAt"),
  part2StartedAt: timestamp("part2StartedAt"),
  part2CompletedAt: timestamp("part2CompletedAt"),
  part3StartedAt: timestamp("part3StartedAt"),
  part3CompletedAt: timestamp("part3CompletedAt"),
  part4StartedAt: timestamp("part4StartedAt"),
  part4CompletedAt: timestamp("part4CompletedAt"),
  part5StartedAt: timestamp("part5StartedAt"),
  part5CompletedAt: timestamp("part5CompletedAt"),
  part6StartedAt: timestamp("part6StartedAt"),
  part6CompletedAt: timestamp("part6CompletedAt"),
  estimatedCompletionAt: timestamp("estimatedCompletionAt"),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = typeof analysisResults.$inferInsert;

/**
 * Admin wallets - authorized MetaMask addresses for admin access
 */
export const adminWallets = mysqlTable("admin_wallets", {
  id: int("id").autoincrement().primaryKey(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull().unique(),
  label: varchar("label", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminWallet = typeof adminWallets.$inferSelect;
export type InsertAdminWallet = typeof adminWallets.$inferInsert;

/**
 * Used signatures - for replay attack prevention
 */
export const usedSignatures = mysqlTable("used_signatures", {
  id: int("id").autoincrement().primaryKey(),
  signature: varchar("signature", { length: 255 }).notNull().unique(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type UsedSignature = typeof usedSignatures.$inferSelect;
export type InsertUsedSignature = typeof usedSignatures.$inferInsert;

/**
 * Platform statistics - aggregated stats for admin dashboard
 */
export const platformStats = mysqlTable("platform_stats", {
  id: int("id").autoincrement().primaryKey(),
  date: timestamp("date").notNull(),
  totalRevenuUsd: decimal("totalRevenueUsd", { precision: 12, scale: 2 }).default("0"),
  totalRevenueCrypto: decimal("totalRevenueCrypto", { precision: 18, scale: 8 }).default("0"),
  countStandard: int("countStandard").default(0),
  countMedium: int("countMedium").default(0),
  countFull: int("countFull").default(0),
  landingViews: int("landingViews").default(0),
  paymentStarted: int("paymentStarted").default(0),
  paymentCompleted: int("paymentCompleted").default(0),
});

export type PlatformStats = typeof platformStats.$inferSelect;
export type InsertPlatformStats = typeof platformStats.$inferInsert;

/**
 * Email subscribers - collected from soft gate modal for marketing
 */
export const emailSubscribers = mysqlTable("email_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 64 }).default("demo_gate").notNull(), // demo_gate, newsletter, etc.
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  // Double opt-in verification
  verificationToken: varchar("verificationToken", { length: 64 }),
  verificationSentAt: timestamp("verificationSentAt"),
  isVerified: boolean("isVerified").default(false).notNull(),
  verifiedAt: timestamp("verifiedAt"),
});

export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribers.$inferInsert;

/**
 * Email sequence status - tracks progress through nurturing email sequence
 */
export const emailSequenceStatus = mysqlTable("email_sequence_status", {
  id: int("id").autoincrement().primaryKey(),
  subscriberId: int("subscriberId").references(() => emailSubscribers.id).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  // Email 1: Welcome (immediate)
  email1SentAt: timestamp("email1SentAt"),
  email1OpenedAt: timestamp("email1OpenedAt"),
  email1ClickedAt: timestamp("email1ClickedAt"),
  // Email 2: Social Proof (day 2-3)
  email2SentAt: timestamp("email2SentAt"),
  email2OpenedAt: timestamp("email2OpenedAt"),
  email2ClickedAt: timestamp("email2ClickedAt"),
  // Email 3: Problem-Solution (day 5-7)
  email3SentAt: timestamp("email3SentAt"),
  email3OpenedAt: timestamp("email3OpenedAt"),
  email3ClickedAt: timestamp("email3ClickedAt"),
  // Email 4: Priority Offer (day 10-14)
  email4SentAt: timestamp("email4SentAt"),
  email4OpenedAt: timestamp("email4OpenedAt"),
  email4ClickedAt: timestamp("email4ClickedAt"),
  // Conversion tracking
  convertedAt: timestamp("convertedAt"),
  conversionSessionId: varchar("conversionSessionId", { length: 64 }),
  // Unsubscribe tracking
  unsubscribedAt: timestamp("unsubscribedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailSequenceStatus = typeof emailSequenceStatus.$inferSelect;
export type InsertEmailSequenceStatus = typeof emailSequenceStatus.$inferInsert;

/**
 * Email opens tracking - detailed log of email opens
 */
export const emailOpens = mysqlTable("email_opens", {
  id: int("id").autoincrement().primaryKey(),
  trackingId: varchar("trackingId", { length: 64 }).notNull().unique(), // Unique ID for each email sent
  subscriberId: int("subscriberId").references(() => emailSubscribers.id),
  email: varchar("email", { length: 320 }).notNull(),
  emailNumber: int("emailNumber").notNull(), // 1, 2, 3, or 4
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
});

export type EmailOpen = typeof emailOpens.$inferSelect;
export type InsertEmailOpen = typeof emailOpens.$inferInsert;
