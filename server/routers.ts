import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

import {
  createAnalysisSession,
  getAnalysisSessionById,
  updateAnalysisSessionStatus,
  getAnalysisSessionsByUserId,
  createPurchase,
  getPurchaseBySessionId,
  updatePurchaseStatus,
  getPurchasesByUserId,
  createAnalysisResult,
  getAnalysisResultBySessionId,
  updateAnalysisResult,
  getAnalysisResultsByUserId,
  getAdminStats,
  getTransactionHistory,
  addAdminWallet,
  getAdminWallets,
  updateAnalysisPartProgress,
  setEstimatedCompletion,
  saveEmailSubscriber,
  getAllEmailSubscribers,
  getEmailSubscriberCount,
  getDemoAnalysisResult,
} from "./db";

import { Tier, getTierPrice, getTierConfig, TIER_CONFIGS, isMultiPartTier } from "../shared/pricing";
import { generateAnalysis, generateSingleAnalysis, generateMultiPartAnalysis, generateInsiderAnalysis } from "./services/perplexityService";
// LemonSqueezy - commented out until company is established
// import { createCheckout, isLemonSqueezyConfigured } from "./services/lemonSqueezyService";
// Coinbase - replaced with NOWPayments
// import { createCharge, isCoinbaseConfigured } from "./services/coinbaseService";
import { createInvoice, isNowPaymentsConfigured, getPaymentStatus } from "./services/nowPaymentsService";
import { createOrder as createPayPalOrder, captureOrder as capturePayPalOrder, isPayPalConfigured } from "./services/paypalService";
import { verifyAdminSignature, verifyAdminSignatureWithChallenge, checkAdminStatus, generateChallenge } from "./services/walletAuthService";
import { sendValidateStrategyEmail, isEmailConfigured } from "./services/emailService";
// isPerplexityConfigured is now checked via PERPLEXITY_API_KEY env var directly

// Error handling imports
import {
  AnalysisError,
  AnalysisErrorCode,
  ErrorCategory,
  TIER_ERROR_CONFIGS,
  classifyError,
  ApiError,
  TimeoutError,
  PartialFailureError,
  CircuitBreakerOpenError,
  MaxRetriesExceededError
} from "./services/errorHandling";
import {
  perplexityCircuitBreaker,
  CircuitState
} from "./services/retryStrategy";
import {
  handlePartialFailure,
  getRecoveryStatus,
  generateFallbackContent
} from "./services/gracefulDegradation";
import {
  notifyAnalysisFailed,
  notifyPartialCompletion
} from "./services/errorNotifications";
import {
  getDashboardData,
  getHealthStatus,
  getMetrics
} from "./services/errorMonitoring";
import {
  createPartialResultsManager,
  PartialResultsManager,
  logAnalysisStart,
  logPartComplete,
  logAnalysisComplete,
  logError,
  recordMetric,
  addToRetryQueue,
  RetryPriority,
  withRetry
} from "./services/analysisHelpers";
import {
  recordMetricToDB,
  recordAnalysisRequestToDB,
  recordSuccessToDB,
  recordFailureToDB,
  getRecentHistoricalMetrics,
  getErrorSummary,
  runHourlyAggregation
} from "./services/metricsPersistence";
import {
  alertCircuitBreakerOpen,
  alertHighFailureRate,
  alertCriticalError,
  recordRequestForFailureRate,
  getFailureRateStats,
  onCircuitBreakerStateChange
} from "./services/adminAlerts";
import {
  addToRetryQueueDB,
  getQueueStats,
  startRetryQueueProcessor,
  stopRetryQueueProcessor,
  isProcessorRunning
} from "./services/retryQueueProcessor";
import {
  createOperation,
  transitionState,
  recordPartCompletion,
  recordPartFailure,
  getOperationDetails,
  getOperationBySessionId,
  getOperations,
  getRetryableOperations,
  pauseOperation,
  resumeOperation,
  cancelOperation,
  triggerRegeneration,
  TIER_PARTS
} from "./services/analysisStateMachine";
import {
  trackAnalysisStart,
  trackPartStart,
  trackPartComplete,
  trackPartFailure,
  trackAnalysisComplete,
  trackAnalysisFailure,
  trackPartialSuccess,
  trackQueuedForRetry,
  getCircuitBreakerStatus as getTrackerCircuitStatus,
  resetCircuitBreaker as resetTrackerCircuit
} from "./services/safeOperationTracker";

// Zod schemas
const tierSchema = z.enum(["standard", "medium", "full"]);

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PRICING ============
  pricing: router({
    getTiers: publicProcedure.query(() => {
      return Object.values(TIER_CONFIGS);
    }),
    getTier: publicProcedure
      .input(z.object({ tier: tierSchema }))
      .query(({ input }) => {
        return getTierConfig(input.tier);
      }),
  }),

  // ============ ANALYSIS SESSION ============
  session: router({
    create: publicProcedure
      .input(z.object({
        problemStatement: z.string().min(10).max(5000),
        tier: tierSchema,
        email: z.string().email().optional(),
        isPriority: z.boolean().optional(),
        prioritySource: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const sessionId = nanoid(16);

        await createAnalysisSession({
          sessionId,
          userId: ctx.user?.id,
          email: input.email || ctx.user?.email,
          problemStatement: input.problemStatement,
          tier: input.tier,
          status: "pending_payment",
          isPriority: input.isPriority || false,
          prioritySource: input.prioritySource,
        });

        return { sessionId, tier: input.tier };
      }),

    get: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getAnalysisSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }
        return session;
      }),

    getMyAnalyses: protectedProcedure.query(async ({ ctx }) => {
      const sessions = await getAnalysisSessionsByUserId(ctx.user.id);
      const results = await getAnalysisResultsByUserId(ctx.user.id);
      const purchases = await getPurchasesByUserId(ctx.user.id);

      return sessions.map(session => ({
        ...session,
        result: results.find(r => r.sessionId === session.sessionId),
        purchase: purchases.find(p => p.sessionId === session.sessionId),
      }));
    }),
  }),

  // ============ PAYMENT ============
  payment: router({
    // NOWPayments - Primary crypto payment method
    createNowPaymentsInvoice: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        tier: tierSchema,
        problemStatement: z.string().min(10).max(10000),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isNowPaymentsConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "NOWPayments is not configured" });
        }

        const appUrl = process.env.VITE_APP_URL || 'https://rapid-apollo-manus.manus.space';
        const tierConfig = getTierConfig(input.tier);

        const invoice = await createInvoice({
          priceAmount: getTierPrice(input.tier),
          priceCurrency: 'usd',
          orderId: input.sessionId,
          orderDescription: `APEX Analysis - ${tierConfig?.displayName || input.tier} Tier`,
          ipnCallbackUrl: `${appUrl}/api/webhooks/nowpayments`,
          successUrl: `${appUrl}/payment-success/${input.sessionId}`,
          cancelUrl: `${appUrl}/checkout/${input.sessionId}`,
        });

        // Create purchase record
        await createPurchase({
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          tier: input.tier,
          amountUsd: getTierPrice(input.tier).toString(),
          paymentMethod: "nowpayments",
          paymentStatus: "pending",
        });

        return {
          invoiceId: invoice.id,
          invoiceUrl: invoice.invoice_url,
        };
      }),

    // Get NOWPayments payment status
    getNowPaymentsStatus: publicProcedure
      .input(z.object({ paymentId: z.string() }))
      .query(async ({ input }) => {
        const status = await getPaymentStatus(input.paymentId);
        return status;
      }),

    /* LemonSqueezy - COMMENTED OUT until company is established
    createLemonSqueezyCheckout: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        tier: tierSchema,
        problemStatement: z.string(),
        email: z.string().email().optional(),
        isPriority: z.boolean().optional(),
        prioritySource: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Uncomment and import when enabling:
        // if (!isLemonSqueezyConfigured()) {
        //   throw new TRPCError({ code: "PRECONDITION_FAILED", message: "LemonSqueezy is not configured" });
        // }
        // const result = await createCheckout(...);
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "LemonSqueezy is not available yet" });
      }),
    */

    /* Coinbase Commerce - REPLACED with NOWPayments
    createCoinbaseCharge: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        tier: tierSchema,
        problemStatement: z.string().min(10).max(10000),
        walletAddress: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Coinbase is replaced with NOWPayments" });
      }),
    */

    // PayPal order creation
    createPayPalOrder: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        tier: tierSchema,
        problemStatement: z.string().min(10).max(10000),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isPayPalConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "PayPal is not configured" });
        }

        const result = await createPayPalOrder(input.tier, input.sessionId, input.problemStatement);

        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }

        // Create purchase record
        await createPurchase({
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          tier: input.tier,
          amountUsd: getTierPrice(input.tier).toString(),
          paymentMethod: "paypal",
          paymentStatus: "pending",
          paypalOrderId: result.orderId,
        });

        return {
          orderId: result.orderId,
          approvalUrl: result.approvalUrl,
        };
      }),

    // PayPal order capture (after user approval)
    capturePayPalOrder: publicProcedure
      .input(z.object({
        orderId: z.string(),
        sessionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        // SECURITY: Idempotency check - prevent double-capture on network retry/double-click
        const existingPurchase = await getPurchaseBySessionId(input.sessionId);
        if (existingPurchase?.paymentStatus === "completed") {
          console.log(`[PayPal] Idempotency: session ${input.sessionId} already completed`);
          return {
            success: true,
            captureId: "already_captured",
            duplicate: true,
          };
        }

        const result = await capturePayPalOrder(input.orderId);

        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }

        // Update purchase status
        await updatePurchaseStatus(input.sessionId, "completed");

        // Notify owner
        const purchase = await getPurchaseBySessionId(input.sessionId);
        if (purchase) {
          await notifyOwner({
            title: "New PayPal Purchase",
            content: `Tier: ${purchase.tier}\nAmount: $${purchase.amountUsd}\nSession: ${input.sessionId}`,
          });
        }

        return {
          success: true,
          captureId: result.captureId,
        };
      }),

    getStatus: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const purchase = await getPurchaseBySessionId(input.sessionId);
        return purchase ? { status: purchase.paymentStatus } : null;
      }),

    // Called after successful payment to trigger analysis
    confirmAndStartAnalysis: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const session = await getAnalysisSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }

        // SECURITY: Prevent duplicate analysis starts (race condition/double-submit protection)
        if (session.status !== "pending_payment") {
          console.log(`[Analysis] Deduplication: session ${input.sessionId} already has status "${session.status}"`);
          return { status: session.status as string };
        }

        const purchase = await getPurchaseBySessionId(input.sessionId);
        if (!purchase || purchase.paymentStatus !== "completed") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment not completed" });
        }

        // Update session status
        await updateAnalysisSessionStatus(input.sessionId, "processing");

        // Create initial result record
        await createAnalysisResult({
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          tier: session.tier,
          problemStatement: session.problemStatement,
        });

        // Start analysis (async)
        startAnalysisInBackground(input.sessionId, session.problemStatement, session.tier, session.email);

        // Notify owner of new purchase
        const tierConfig = getTierConfig(session.tier);
        await notifyOwner({
          title: `New ${tierConfig?.displayName || session.tier} Purchase`,
          content: `A new analysis has been purchased.\n\nTier: ${tierConfig?.displayName}\nAmount: $${getTierPrice(session.tier)}\nProblem: ${session.problemStatement.substring(0, 200)}...`,
        });

        return { status: "processing" };
      }),
  }),

  // ============ ANALYSIS RESULTS ============
  analysis: router({
    getResult: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const result = await getAnalysisResultBySessionId(input.sessionId);
        if (!result) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Analysis result not found" });
        }
        return result;
      }),

    getMyResults: protectedProcedure.query(async ({ ctx }) => {
      return await getAnalysisResultsByUserId(ctx.user.id);
    }),
  }),

  // ============ EMAIL SUBSCRIBERS ============
  emailSubscriber: router({
    // Subscribe with double opt-in verification
    subscribe: publicProcedure
      .input(z.object({
        email: z.string().email(),
        source: z.string().optional().default("demo_gate"),
        recaptchaToken: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verify reCAPTCHA if token provided (soft verification - never blocks users)
        if (input.recaptchaToken) {
          try {
            const { verifyRecaptcha } = await import("./services/recaptchaService");
            const recaptchaResult = await verifyRecaptcha(input.recaptchaToken, "email_subscribe", 0.3);
            if (recaptchaResult.success) {
              console.log(`[EmailSubscriber] reCAPTCHA passed for ${input.email}: score=${recaptchaResult.score}`);
            } else {
              // Log but don't block - honeypot and disposable email checks are primary protection
              console.warn(`[EmailSubscriber] reCAPTCHA soft-fail for ${input.email}: ${recaptchaResult.error}`);
            }
          } catch (recaptchaError) {
            // Never block on reCAPTCHA errors - it's supplementary protection
            console.warn(`[EmailSubscriber] reCAPTCHA error for ${input.email}:`, recaptchaError);
          }
        }

        // Import validation service
        const { validateEmail, generateVerificationToken } = await import("./services/emailValidationService");
        const { sendVerificationEmail } = await import("./services/emailService");

        // Validate email (format + disposable check)
        const validation = validateEmail(input.email);
        if (!validation.isValid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error || "Invalid email address"
          });
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();

        // Save subscriber with verification token
        const result = await saveEmailSubscriber(input.email, input.source, verificationToken);

        // If email already exists and is verified, return success
        if (!result.isNew && result.isVerified) {
          return { success: true, isNew: false, needsVerification: false, isVerified: true };
        }

        // If email already exists but not verified, resend verification
        if (!result.isNew && !result.isVerified) {
          // Update verification token
          const { getEmailSubscriberByEmail } = await import("./db");
          const subscriber = await getEmailSubscriberByEmail(input.email);
          if (subscriber) {
            const { getDb } = await import("./db");
            const { emailSubscribers } = await import("../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            const db = await getDb();
            if (db) {
              await db.update(emailSubscribers)
                .set({
                  verificationToken,
                  verificationSentAt: new Date()
                })
                .where(eq(emailSubscribers.id, subscriber.id));
            }
          }
        }

        // Send verification email
        const appUrl = process.env.VITE_APP_URL || 'https://validatestrategy.com';
        const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

        try {
          await sendVerificationEmail({
            to: input.email,
            verificationUrl,
          });
          console.log(`[EmailSubscriber] Verification email sent to ${input.email}`);
        } catch (error) {
          console.error(`[EmailSubscriber] Failed to send verification email to ${input.email}:`, error);
        }

        return {
          success: true,
          isNew: result.isNew,
          needsVerification: true,
          isVerified: false,
          subscriberId: result.subscriberId
        };
      }),

    // Verify email with token
    verify: publicProcedure
      .input(z.object({
        token: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { verifyEmailSubscriber } = await import("./db");
        const result = await verifyEmailSubscriber(input.token);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired verification link"
          });
        }

        // Send welcome email after verification
        if (result.email) {
          try {
            const { sendWelcomeEmail } = await import("./emailNurturing");
            const { getEmailSubscriberByEmail } = await import("./db");
            const subscriber = await getEmailSubscriberByEmail(result.email);
            if (subscriber) {
              await sendWelcomeEmail(subscriber.id, result.email);
              console.log(`[EmailSubscriber] Welcome email sent to ${result.email}`);
            }
          } catch (error) {
            console.error(`[EmailSubscriber] Failed to send welcome email:`, error);
          }
        }

        return { success: true, email: result.email };
      }),

    // Check if email is verified
    checkVerification: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .query(async ({ input }) => {
        const { getEmailSubscriberByEmail } = await import("./db");
        const subscriber = await getEmailSubscriberByEmail(input.email);
        return {
          exists: !!subscriber,
          isVerified: subscriber?.isVerified || false
        };
      }),

    // Admin only - get all subscribers
    getAll: protectedProcedure.query(async () => {
      return await getAllEmailSubscribers();
    }),

    // Admin only - get subscriber count
    getCount: protectedProcedure.query(async () => {
      return await getEmailSubscriberCount();
    }),

    // Process email sequence (can be called via cron or manually)
    processSequence: protectedProcedure.mutation(async () => {
      const { runEmailSequenceCron } = await import("./emailCron");
      return await runEmailSequenceCron();
    }),
  }),

  // ============ DEMO ============
  demo: router({
    getAnalysis: publicProcedure.query(async () => {
      const result = await getDemoAnalysisResult();
      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Demo analysis not found" });
      }
      // Also get the session info for problem statement
      const session = await getAnalysisSessionById(result.sessionId);
      return {
        ...result,
        problemStatement: session?.problemStatement || "Demo analysis",
        tier: session?.tier || result.tier,
        status: session?.status || "completed",
      };
    }),
  }),

  // ============ ADMIN ============
  admin: router({
    checkStatus: publicProcedure
      .input(z.object({ address: z.string() }))
      .query(async ({ input }) => {
        const isAdmin = await checkAdminStatus(input.address);
        return { isAdmin };
      }),

    requestChallenge: publicProcedure
      .input(z.object({ walletAddress: z.string() }))
      .mutation(async ({ input }) => {
        const isAdmin = await checkAdminStatus(input.walletAddress);
        if (!isAdmin) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Not an admin wallet" });
        }
        // Use the walletAuthService to generate and store the challenge
        const { challenge, timestamp } = await generateChallenge(input.walletAddress);
        return { challenge, timestamp };
      }),

    verifySignature: publicProcedure
      .input(z.object({
        walletAddress: z.string(),
        signature: z.string(),
        challenge: z.string(),
        timestamp: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Use the challenge-based verification
        const result = await verifyAdminSignatureWithChallenge(
          input.signature,
          input.challenge,
          input.timestamp,
          input.walletAddress
        );

        if (!result.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: result.error });
        }

        return { success: true };
      }),

    authenticate: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!result.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: result.error });
        }

        return { success: true, isAdmin: true };
      }),

    getStats: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        // Verify admin first
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const stats = await getAdminStats();
        return stats;
      }),

    getTransactions: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        // Verify admin first
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const transactions = await getTransactionHistory(input.limit);
        return { transactions, total: transactions.length };
      }),

    addWallet: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        newWalletAddress: z.string(),
        label: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Verify admin first
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        await addAdminWallet({
          walletAddress: input.newWalletAddress,
          label: input.label,
        });

        return { success: true };
      }),

    getWallets: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        return await getAdminWallets();
      }),

    // Get all email subscribers for admin dashboard
    getEmailSubscribers: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const { getAllEmailSubscribers, getEmailSubscriberCount } = await import("./db");
        const subscribers = await getAllEmailSubscribers();
        const totalCount = await getEmailSubscriberCount();
        const verifiedCount = subscribers.filter(s => s.isVerified).length;

        return {
          subscribers,
          stats: {
            total: totalCount,
            verified: verifiedCount,
            unverified: totalCount - verifiedCount,
            verificationRate: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0
          }
        };
      }),

    // Get error dashboard data for admin
    getErrorDashboard: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        // Get error dashboard data from monitoring module
        const dashboardData = getDashboardData();
        const healthStatus = getHealthStatus();
        const metrics = getMetrics();

        // Get circuit breaker status
        const circuitBreakerStats = perplexityCircuitBreaker.getStats();

        return {
          dashboard: dashboardData,
          health: healthStatus,
          metrics: metrics,
          circuitBreaker: {
            state: circuitBreakerStats.state,
            failures: circuitBreakerStats.failures,
            recentFailures: circuitBreakerStats.recentFailures,
            resetTime: circuitBreakerStats.resetTime?.toISOString() || null,
          },
        };
      }),

    // Reset circuit breaker (admin action)
    resetCircuitBreaker: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        // Force reset the circuit breaker
        perplexityCircuitBreaker.forceReset();

        return { success: true, message: "Circuit breaker reset to CLOSED state" };
      }),

    // Get historical metrics (admin action)
    getHistoricalMetrics: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        hours: z.number().optional().default(24),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const historicalMetrics = await getRecentHistoricalMetrics(input.hours);
        const failureRateStats = getFailureRateStats();

        return {
          ...historicalMetrics,
          currentFailureRate: failureRateStats,
        };
      }),

    // Get error summary (admin action)
    getErrorSummary: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        hours: z.number().optional().default(24),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const end = new Date();
        const start = new Date(end.getTime() - input.hours * 60 * 60 * 1000);
        const errorSummary = await getErrorSummary({ start, end });

        return { errors: errorSummary };
      }),

    // Get retry queue stats (admin action)
    getRetryQueueStats: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const queueStats = await getQueueStats();
        const processorRunning = isProcessorRunning();

        return {
          ...queueStats,
          processorRunning,
        };
      }),

    // Start/stop retry queue processor (admin action)
    toggleRetryProcessor: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        action: z.enum(["start", "stop"]),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        if (input.action === "start") {
          startRetryQueueProcessor();
          return { success: true, message: "Retry queue processor started" };
        } else {
          stopRetryQueueProcessor();
          return { success: true, message: "Retry queue processor stopped" };
        }
      }),

    // Trigger hourly metrics aggregation (admin action)
    triggerMetricsAggregation: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        await runHourlyAggregation();
        return { success: true, message: "Hourly metrics aggregation triggered" };
      }),

    // ============ ANALYSIS OPERATIONS CENTER ============

    /**
     * Get all analysis operations with filtering
     * Returns paginated list of operations with their current state
     */
    getAnalysisOperations: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        state: z.enum(["initialized", "generating", "part_completed", "paused", "failed", "completed", "cancelled"]).optional(),
        tier: tierSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const operations = await getOperations({
          state: input.state,
          tier: input.tier,
          limit: input.limit,
          offset: input.offset,
        });

        // Get total count for pagination
        const allOps = await getOperations({ state: input.state, tier: input.tier });

        return {
          operations: operations.map(op => ({
            ...op,
            progressPercent: op.totalParts > 0
              ? Math.round((op.completedParts / op.totalParts) * 100)
              : 0,
            tierLabel: op.tier === 'standard' ? 'Observer' : op.tier === 'medium' ? 'Insider' : 'Syndicate',
          })),
          total: allOps.length,
          hasMore: input.offset + operations.length < allOps.length,
        };
      }),

    /**
     * Get detailed operation information including events and partial results
     */
    getOperationDetails: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        operationId: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const details = await getOperationDetails(input.operationId);

        if (!details) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Operation not found" });
        }

        // Calculate additional metrics
        const op = details.operation;
        const completedEvents = details.events.filter(e => e.eventType === 'part_completed');
        const avgPartDuration = completedEvents.length > 0
          ? Math.round(completedEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0) / completedEvents.length)
          : null;

        return {
          operation: {
            ...op,
            progressPercent: op.totalParts > 0
              ? Math.round((op.completedParts / op.totalParts) * 100)
              : 0,
            tierLabel: op.tier === 'standard' ? 'Observer' : op.tier === 'medium' ? 'Insider' : 'Syndicate',
          },
          events: details.events.map(e => ({
            ...e,
            createdAtFormatted: e.createdAt ? new Date(e.createdAt).toISOString() : null,
          })),
          partialResults: details.partialResults,
          metrics: {
            avgPartDurationMs: avgPartDuration,
            totalEventsCount: details.events.length,
            failureEventsCount: details.events.filter(e =>
              e.eventType === 'part_failed' || e.eventType === 'operation_failed'
            ).length,
          },
        };
      }),

    /**
     * Get operation by session ID
     */
    getOperationBySession: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        sessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const operation = await getOperationBySessionId(input.sessionId);

        if (!operation) {
          return { found: false, operation: null };
        }

        return {
          found: true,
          operation: {
            ...operation,
            progressPercent: operation.totalParts > 0
              ? Math.round((operation.completedParts / operation.totalParts) * 100)
              : 0,
            tierLabel: operation.tier === 'standard' ? 'Observer' : operation.tier === 'medium' ? 'Insider' : 'Syndicate',
          },
        };
      }),

    /**
     * Get all failed operations that can be retried
     */
    getRetryableOperations: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const operations = await getRetryableOperations();

        return {
          operations: operations.map(op => ({
            ...op,
            progressPercent: op.totalParts > 0
              ? Math.round((op.completedParts / op.totalParts) * 100)
              : 0,
            tierLabel: op.tier === 'standard' ? 'Observer' : op.tier === 'medium' ? 'Insider' : 'Syndicate',
            canRetry: op.retryCount < 5,
          })),
          total: operations.length,
        };
      }),

    /**
     * Pause an active operation (admin action)
     */
    pauseOperation: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        operationId: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const result = await pauseOperation(input.operationId, input.address, input.reason);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to pause operation"
          });
        }

        return {
          success: true,
          message: `Operation paused successfully`,
          previousState: result.previousState,
          newState: result.newState,
        };
      }),

    /**
     * Resume a paused operation (admin action)
     */
    resumeOperation: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        operationId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const result = await resumeOperation(input.operationId, input.address);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to resume operation"
          });
        }

        return {
          success: true,
          message: `Operation resumed successfully`,
          previousState: result.previousState,
          newState: result.newState,
        };
      }),

    /**
     * Cancel an operation (admin action)
     */
    cancelOperation: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        operationId: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const result = await cancelOperation(input.operationId, input.address, input.reason);

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to cancel operation"
          });
        }

        return {
          success: true,
          message: `Operation cancelled successfully`,
          previousState: result.previousState,
          newState: result.newState,
        };
      }),

    /**
     * Trigger regeneration of a failed analysis (admin action)
     * Creates a new operation and starts the analysis process
     */
    triggerRegeneration: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        sessionId: z.string(),
        fromPart: z.number().min(1).max(6).optional(),
      }))
      .mutation(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        const result = await triggerRegeneration(input.sessionId, input.address, {
          fromPart: input.fromPart,
        });

        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error || "Failed to trigger regeneration"
          });
        }

        // Get session to start background analysis
        const session = await getAnalysisSessionById(input.sessionId);
        if (session) {
          // Start the analysis in background
          startAnalysisInBackground(
            input.sessionId,
            session.problemStatement,
            session.tier as Tier,
            session.email
          );
        }

        return {
          success: true,
          message: `Regeneration triggered successfully`,
          newOperationId: result.newOperationId,
        };
      }),

    /**
     * Get server logs for admin dashboard
     */
    getLogs: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
        level: z.enum(['all', 'error', 'warn', 'info']).optional().default('all'),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        // Read logs from file
        const fs = await import('fs/promises');
        const path = await import('path');
        
        try {
          const logsDir = path.join(process.cwd(), 'logs');
          const combinedLogPath = path.join(logsDir, 'combined.log');
          const errorLogPath = path.join(logsDir, 'error.log');
          
          let logs: Array<{ timestamp: string; level: string; message: string; metadata?: any }> = [];
          
          // Read combined log
          try {
            const combinedContent = await fs.readFile(combinedLogPath, 'utf-8');
            const lines = combinedContent.split('\n').filter(line => line.trim());
            
            for (const line of lines.slice(-input.limit)) {
              const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\]: (.*)$/);
              if (match) {
                const [, timestamp, level, message] = match;
                if (input.level === 'all' || level.toLowerCase() === input.level) {
                  logs.push({ timestamp, level: level.toLowerCase(), message });
                }
              }
            }
          } catch (e) {
            // Log file might not exist yet
          }
          
          // Sort by timestamp descending (newest first)
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          return {
            logs: logs.slice(0, input.limit),
            total: logs.length,
          };
        } catch (error) {
          return {
            logs: [],
            total: 0,
            error: 'Failed to read logs',
          };
        }
      }),

    /**
     * Get analysis operations summary for dashboard
     */
    getOperationsSummary: publicProcedure
      .input(z.object({
        signature: z.string(),
        timestamp: z.number(),
        address: z.string(),
      }))
      .query(async ({ input }) => {
        const authResult = await verifyAdminSignature(
          input.signature,
          input.timestamp,
          input.address
        );

        if (!authResult.success) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: authResult.error });
        }

        // Get counts by state
        const allOps = await getOperations({});
        const stateCounts = {
          initialized: 0,
          generating: 0,
          part_completed: 0,
          paused: 0,
          failed: 0,
          completed: 0,
          cancelled: 0,
        };

        const tierCounts = {
          standard: 0,
          medium: 0,
          full: 0,
        };

        let totalCompletedParts = 0;
        let totalParts = 0;

        for (const op of allOps) {
          stateCounts[op.state as keyof typeof stateCounts]++;
          tierCounts[op.tier as keyof typeof tierCounts]++;
          totalCompletedParts += op.completedParts;
          totalParts += op.totalParts;
        }

        const activeOperations = stateCounts.initialized + stateCounts.generating + stateCounts.part_completed;
        const failedOperations = stateCounts.failed;
        const successRate = allOps.length > 0
          ? Math.round((stateCounts.completed / allOps.length) * 100)
          : 0;

        return {
          total: allOps.length,
          stateCounts,
          tierCounts,
          activeOperations,
          failedOperations,
          completedOperations: stateCounts.completed,
          successRate,
          overallProgress: totalParts > 0
            ? Math.round((totalCompletedParts / totalParts) * 100)
            : 0,
        };
      }),
  }),

  // ============ CONFIG ============
  config: router({
    getPaymentConfig: publicProcedure.query(() => {
      return {
        // NOWPayments is the primary crypto payment method
        nowPaymentsEnabled: isNowPaymentsConfigured(),
        // LemonSqueezy disabled until company is established
        lemonSqueezyEnabled: false, // isLemonSqueezyConfigured(),
        // Coinbase replaced with NOWPayments
        coinbaseEnabled: false, // isCoinbaseConfigured(),
        paypalEnabled: isPayPalConfigured(),
        perplexityEnabled: !!process.env.PERPLEXITY_API_KEY,
      };
    }),
  }),

  // APEX analysis is now handled via payment.confirmAndStartAnalysis which uses the 6-part generateMultiPartAnalysis
});

// Background analysis function with comprehensive error handling
async function startAnalysisInBackground(sessionId: string, problemStatement: string, tier: Tier, email?: string | null) {
  const startTime = Date.now();
  const tierConfig = TIER_ERROR_CONFIGS[tier];
  let partialResultsManager: PartialResultsManager | null = null;

  // Log analysis start
  logAnalysisStart(sessionId, tier, problemStatement);

  // Track analysis start in Operations Center (fire-and-forget, never blocks)
  trackAnalysisStart(sessionId, tier, "user");

  // Check circuit breaker state before starting
  const circuitState = perplexityCircuitBreaker.getState();
  if (circuitState === CircuitState.OPEN) {
    console.warn(`[Analysis] Circuit breaker OPEN - queueing session ${sessionId} for retry`);

    // Add to retry queue instead of failing immediately
    await addToRetryQueue({
      sessionId,
      tier,
      problemStatement,
      email: email || undefined,
      retryCount: 0,
      priority: tier === 'full' ? RetryPriority.HIGH : tier === 'medium' ? RetryPriority.MEDIUM : RetryPriority.LOW,
      createdAt: new Date(),
      lastError: 'Circuit breaker open - API temporarily unavailable',
    });

    // Track queued for retry (fire-and-forget)
    trackQueuedForRetry(sessionId, 'Circuit breaker open - API temporarily unavailable');

    // Notify user about delay (circuit breaker open)
    if (email) {
      // Use classifyError to create proper AnalysisError
      const circuitError = classifyError(new Error('API temporarily unavailable - your analysis is queued'), { sessionId, tier });
      await notifyAnalysisFailed(sessionId, tier, email, true, circuitError);
    }

    await updateAnalysisSessionStatus(sessionId, "processing");
    return;
  }

  try {
    console.log(`[Analysis] Starting ${tier} analysis for session ${sessionId}`);

    if (isMultiPartTier(tier)) {
      // Syndicate tier: 6-part comprehensive APEX analysis with error handling
      const totalParts = 6;
      partialResultsManager = createPartialResultsManager(sessionId, tier, totalParts);

      const result = await generateMultiPartAnalysis(problemStatement, {
        onPartComplete: async (partNum, content) => {
          console.log(`[Analysis] Part ${partNum} complete for session ${sessionId}`);
          logPartComplete(sessionId, partNum, totalParts);

          // Track part start for next part (fire-and-forget)
          if (partNum < totalParts) {
            trackPartStart(sessionId, partNum + 1);
          }

          // Track successful part completion (fire-and-forget)
          trackPartComplete(sessionId, partNum, content, Date.now() - startTime);

          // Track successful part
          partialResultsManager?.markPartComplete(partNum, content);

          // Support all 6 parts for Syndicate tier
          const partKey = `part${partNum}` as "part1" | "part2" | "part3" | "part4" | "part5" | "part6";
          await updateAnalysisResult(sessionId, { [partKey]: content });

          // Record metric
          recordMetric(sessionId, tier, 'part_complete', Date.now() - startTime);
        },
        onComplete: async (result) => {
          await updateAnalysisResult(sessionId, {
            fullMarkdown: result.fullMarkdown,
            generatedAt: new Date(result.generatedAt),
          });
          await updateAnalysisSessionStatus(sessionId, "completed");

          // Log completion
          const duration = Date.now() - startTime;
          logAnalysisComplete(sessionId, tier, duration, true);
          recordMetric(sessionId, tier, 'success', duration);

          // Track analysis completion (fire-and-forget)
          trackAnalysisComplete(sessionId, duration);

          console.log(`[Analysis] 6-part Syndicate analysis complete for session ${sessionId} in ${duration}ms`);

          // Send success email notification
          if (email && isEmailConfigured()) {
            await sendValidateStrategyEmail({
              to: email,
              userName: email.split('@')[0],
              magicLinkUrl: `${process.env.VITE_APP_URL || ''}/analysis/${sessionId}`,
              transactionId: sessionId,
              amount: String(getTierPrice(tier)),
              currency: 'USD',
              tier: tier,
            });
          }
        },
        onError: async (error) => {
          console.error(`[Analysis] Error for session ${sessionId}:`, error);

          // Check if we have partial results to save
          if (partialResultsManager) {
            const completedParts = partialResultsManager.getCompletedParts();
            const completionPercentage = partialResultsManager.getCompletionPercentage();

            // Check if we have minimum parts for partial success
            const minParts = tierConfig.minPartsForPartialSuccess;
            const minPercentage = (minParts / tierConfig.expectedParts) * 100;
            if (completionPercentage >= minPercentage) {
              // We have enough for partial delivery
              console.log(`[Analysis] Saving partial results (${completionPercentage}%) for session ${sessionId}`);

              const partialMarkdown = partialResultsManager.generatePartialMarkdown();
              await updateAnalysisResult(sessionId, {
                fullMarkdown: partialMarkdown,
                generatedAt: new Date(),
              });
              // Mark as completed even if partial (user can still view results)
              await updateAnalysisSessionStatus(sessionId, "completed");

              // Log partial success
              console.log(`[Analysis] Partial success: ${completedParts.length}/${totalParts} parts completed for session ${sessionId}`);

              // Track partial success (fire-and-forget)
              trackPartialSuccess(sessionId, completedParts.length, totalParts);

              logAnalysisComplete(sessionId, tier, Date.now() - startTime, false, completionPercentage);
              return;
            }
          }

          // Track failure before adding to retry queue (fire-and-forget)
          const failedPartSyndicate = partialResultsManager ? partialResultsManager.getCompletedParts().length + 1 : 1;
          trackAnalysisFailure(sessionId, error instanceof Error ? error : new Error(String(error)), failedPartSyndicate);

          // Full failure - add to retry queue
          await handleAnalysisFailure(sessionId, tier, problemStatement, email, error, startTime);
        },
      });
    } else if (tier === "medium") {
      // Insider tier: 2-part strategic blueprint with error handling
      const totalParts = 2;
      partialResultsManager = createPartialResultsManager(sessionId, tier, totalParts);

      console.log(`[Analysis] Starting Insider 2-part analysis for session ${sessionId}`);

      const result = await generateInsiderAnalysis(problemStatement, {
        onPartComplete: async (partNum, content) => {
          console.log(`[Analysis] Insider Part ${partNum} complete for session ${sessionId}`);
          logPartComplete(sessionId, partNum, totalParts);

          // Track part start for next part (fire-and-forget)
          if (partNum < totalParts) {
            trackPartStart(sessionId, partNum + 1);
          }

          // Track successful part completion (fire-and-forget)
          trackPartComplete(sessionId, partNum, content, Date.now() - startTime);

          partialResultsManager?.markPartComplete(partNum, content);

          const partKey = `part${partNum}` as "part1" | "part2";
          await updateAnalysisResult(sessionId, { [partKey]: content });

          recordMetric(sessionId, tier, 'part_complete', Date.now() - startTime);
        },
        onComplete: async (result) => {
          await updateAnalysisResult(sessionId, {
            fullMarkdown: result.fullMarkdown,
            generatedAt: new Date(result.generatedAt),
          });
          await updateAnalysisSessionStatus(sessionId, "completed");

          const duration = Date.now() - startTime;
          logAnalysisComplete(sessionId, tier, duration, true);
          recordMetric(sessionId, tier, 'success', duration);

          // Track analysis completion (fire-and-forget)
          trackAnalysisComplete(sessionId, duration);

          console.log(`[Analysis] 2-part Insider analysis complete for session ${sessionId} in ${duration}ms`);

          // Send email notification
          if (email && isEmailConfigured()) {
            await sendValidateStrategyEmail({
              to: email,
              userName: email.split('@')[0],
              magicLinkUrl: `${process.env.VITE_APP_URL || ''}/analysis/${sessionId}`,
              transactionId: sessionId,
              amount: String(getTierPrice(tier)),
              currency: 'USD',
              tier: tier,
            });
          }
        },
        onError: async (error) => {
          console.error(`[Analysis] Insider error for session ${sessionId}:`, error);

          // Check for partial results (at least part 1)
          if (partialResultsManager) {
            const completedParts = partialResultsManager.getCompletedParts();
            const completionPercentage = partialResultsManager.getCompletionPercentage();

            // Check if we have minimum parts for partial success
            const minParts = tierConfig.minPartsForPartialSuccess;
            const minPercentage = (minParts / tierConfig.expectedParts) * 100;
            if (completionPercentage >= minPercentage) {
              console.log(`[Analysis] Saving partial Insider results (${completionPercentage}%) for session ${sessionId}`);

              const partialMarkdown = partialResultsManager.generatePartialMarkdown();
              await updateAnalysisResult(sessionId, {
                fullMarkdown: partialMarkdown,
                generatedAt: new Date(),
              });
              // Mark as completed even if partial (user can still view results)
              await updateAnalysisSessionStatus(sessionId, "completed");

              // Log partial success
              console.log(`[Analysis] Partial success: ${completedParts.length}/${totalParts} parts completed for session ${sessionId}`);

              // Track partial success (fire-and-forget)
              trackPartialSuccess(sessionId, completedParts.length, totalParts);

              logAnalysisComplete(sessionId, tier, Date.now() - startTime, false, completionPercentage);
              return;
            }
          }

          // Track failure before adding to retry queue (fire-and-forget)
          const failedPartInsider = partialResultsManager ? partialResultsManager.getCompletedParts().length + 1 : 1;
          trackAnalysisFailure(sessionId, error instanceof Error ? error : new Error(String(error)), failedPartInsider);

          await handleAnalysisFailure(sessionId, tier, problemStatement, email, error, startTime);
        },
      });
    } else {
      // Observer tier: Single analysis with retry wrapper
      console.log(`[Analysis] Starting Observer single analysis for session ${sessionId}`);

      const result = await withRetry(
        async () => generateSingleAnalysis(problemStatement, "standard"),
        {
          maxRetries: tierConfig.maxRetries,
          baseDelay: tierConfig.baseDelay,
          maxDelay: 30000,
          onRetry: (attempt, error) => {
            console.log(`[Analysis] Observer retry ${attempt}/${tierConfig.maxRetries} for session ${sessionId}: ${error.message}`);
            recordMetric(sessionId, tier, 'retry', Date.now() - startTime);
          },
        }
      );

      await updateAnalysisResult(sessionId, {
        singleResult: result.content,
        generatedAt: new Date(result.generatedAt),
      });
      await updateAnalysisSessionStatus(sessionId, "completed");

      const duration = Date.now() - startTime;
      logAnalysisComplete(sessionId, tier, duration, true);
      recordMetric(sessionId, tier, 'success', duration);

      // Track analysis completion (fire-and-forget) - Observer is single part
      trackPartComplete(sessionId, 1, result.content, duration);
      trackAnalysisComplete(sessionId, duration);

      console.log(`[Analysis] Observer analysis complete for session ${sessionId} in ${duration}ms`);

      // Send email notification
      if (email && isEmailConfigured()) {
        await sendValidateStrategyEmail({
          to: email,
          userName: email.split('@')[0],
          magicLinkUrl: `${process.env.VITE_APP_URL || ''}/analysis/${sessionId}`,
          transactionId: sessionId,
          amount: String(getTierPrice(tier)),
          currency: 'USD',
          tier: tier,
        });
      }
    }
  } catch (error) {
    // Track failure in outer catch (fire-and-forget)
    trackAnalysisFailure(sessionId, error instanceof Error ? error : new Error(String(error)), 1);

    await handleAnalysisFailure(sessionId, tier, problemStatement, email, error, startTime);
  }
}

// Helper function to handle analysis failures with retry queue and notifications
async function handleAnalysisFailure(
  sessionId: string,
  tier: Tier,
  problemStatement: string,
  email: string | null | undefined,
  error: unknown,
  startTime: number
) {
  const tierConfig = TIER_ERROR_CONFIGS[tier];
  const duration = Date.now() - startTime;

  // Create structured error using classifyError
  const analysisError = error instanceof AnalysisError
    ? error
    : classifyError(error, { sessionId, tier });

  // Log the error
  logError(analysisError, { sessionId, tier, duration });
  recordMetric(sessionId, tier, 'failure', duration);

  console.error(`[Analysis] Failed for session ${sessionId}:`, analysisError.message);

  // Check if we should add to retry queue (recoverable errors only)
  const isRetryable = analysisError.isRetryable &&
    analysisError.category !== ErrorCategory.FATAL;

  if (isRetryable) {
    // Add to retry queue for automatic retry
    await addToRetryQueue({
      sessionId,
      tier,
      problemStatement,
      email: email || undefined,
      retryCount: 0,
      priority: tier === 'full' ? RetryPriority.HIGH : tier === 'medium' ? RetryPriority.MEDIUM : RetryPriority.LOW,
      createdAt: new Date(),
      lastError: analysisError.message,
    });

    await updateAnalysisSessionStatus(sessionId, "processing");

    // Notify user that analysis is queued for retry
    if (email) {
      await notifyAnalysisFailed(sessionId, tier, email, true, analysisError);
    }

    console.log(`[Analysis] Session ${sessionId} queued for retry`);
  } else {
    // Non-retryable error - mark as failed
    await updateAnalysisSessionStatus(sessionId, "failed");

    // Notify user of failure
    if (email) {
      await notifyAnalysisFailed(sessionId, tier, email, false, analysisError);
    }

    // Alert admin for high-value failures
    if (tier === 'full' || tier === 'medium') {
      await notifyOwner({
        title: `Analysis Failed - ${tier.toUpperCase()} Tier`,
        content: `Session: ${sessionId}\nTier: ${tier}\nError: ${analysisError.message}\nCategory: ${analysisError.category}\n\nThis may require manual intervention or refund.`,
      });
    }
  }
}

export type AppRouter = typeof appRouter;
