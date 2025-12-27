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
export const paymentMethodEnum = mysqlEnum("paymentMethod", ["stripe", "coinbase", "paypal"]);

/**
 * Analysis sessions - links problem statement to payment and results
 */
export const analysisSessions = mysqlTable("analysis_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  userId: int("userId").references(() => users.id),
  problemStatement: text("problemStatement").notNull(),
  tier: tierEnum.notNull(),
  status: mysqlEnum("status", ["pending_payment", "processing", "completed", "failed"]).default("pending_payment").notNull(),
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
  // For full/premium tier - 4 parts
  part1: text("part1"),
  part2: text("part2"),
  part3: text("part3"),
  part4: text("part4"),
  fullMarkdown: text("fullMarkdown"),
  totalTokens: int("totalTokens"),
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
