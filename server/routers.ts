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
import { sendRapidApolloEmail, isEmailConfigured } from "./services/emailService";
import { executeApexAnalysis, isPerplexityConfigured } from "./services/perplexityApiService";

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
        problemStatement: z.string(),
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
        problemStatement: z.string(),
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
        problemStatement: z.string(),
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
        perplexityEnabled: isPerplexityConfigured(),
      };
    }),
  }),

  // ============ APEX ANALYSIS (Perplexity API) ============
  apex: router({
    // Check if APEX tier is available (Perplexity configured)
    isAvailable: publicProcedure.query(() => {
      return { available: isPerplexityConfigured() };
    }),

    // Start APEX analysis (requires completed payment for full tier)
    startAnalysis: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        if (!isPerplexityConfigured()) {
          throw new TRPCError({ 
            code: "PRECONDITION_FAILED", 
            message: "APEX analysis is not available. Perplexity API key not configured." 
          });
        }

        const session = await getAnalysisSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }

        if (session.tier !== "full") {
          throw new TRPCError({ 
            code: "PRECONDITION_FAILED", 
            message: "APEX analysis is only available for Syndicate tier" 
          });
        }

        const purchase = await getPurchaseBySessionId(input.sessionId);
        if (!purchase || purchase.paymentStatus !== "completed") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment not completed" });
        }

        // Start APEX analysis in background
        startApexAnalysisInBackground(input.sessionId, session.problemStatement, session.email);

        return { status: "processing", message: "APEX analysis started" };
      }),
  }),
});

// Background analysis function with comprehensive error handling
async function startAnalysisInBackground(sessionId: string, problemStatement: string, tier: Tier, email?: string | null) {
  const startTime = Date.now();
  const tierConfig = TIER_ERROR_CONFIGS[tier];
  let partialResultsManager: PartialResultsManager | null = null;
  
  // Log analysis start
  logAnalysisStart(sessionId, tier, problemStatement);
  
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
          
          console.log(`[Analysis] 6-part Syndicate analysis complete for session ${sessionId} in ${duration}ms`);
          
          // Send success email notification
          if (email && isEmailConfigured()) {
            await sendRapidApolloEmail({
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
              
              logAnalysisComplete(sessionId, tier, Date.now() - startTime, false, completionPercentage);
              return;
            }
          }
          
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
          
          console.log(`[Analysis] 2-part Insider analysis complete for session ${sessionId} in ${duration}ms`);
          
          // Send email notification
          if (email && isEmailConfigured()) {
            await sendRapidApolloEmail({
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
              
              logAnalysisComplete(sessionId, tier, Date.now() - startTime, false, completionPercentage);
              return;
            }
          }
          
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
      
      console.log(`[Analysis] Observer analysis complete for session ${sessionId} in ${duration}ms`);
      
      // Send email notification
      if (email && isEmailConfigured()) {
        await sendRapidApolloEmail({
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

// Background APEX analysis function (uses Perplexity API)
async function startApexAnalysisInBackground(sessionId: string, problemStatement: string, email?: string | null) {
  try {
    console.log(`[APEX Analysis] Starting Perplexity-powered analysis for session ${sessionId}`);
    
    await updateAnalysisSessionStatus(sessionId, "processing");
    
    // Set estimated completion time (approximately 2-3 minutes for full APEX analysis)
    const estimatedCompletion = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    await setEstimatedCompletion(sessionId, estimatedCompletion);

    const result = await executeApexAnalysis(problemStatement, {
      onPartStart: async (partNum) => {
        console.log(`[APEX Analysis] Starting Part ${partNum}/4 for session ${sessionId}`);
        // Update progress: mark part as in_progress
        await updateAnalysisPartProgress(sessionId, partNum as 1 | 2 | 3 | 4, "in_progress");
      },
      onPartComplete: async (partNum, content) => {
        console.log(`[APEX Analysis] Part ${partNum} complete for session ${sessionId}`);
        const partKey = `part${partNum}` as "part1" | "part2" | "part3" | "part4";
        // Update progress: mark part as completed and save content
        await updateAnalysisPartProgress(sessionId, partNum as 1 | 2 | 3 | 4, "completed");
        await updateAnalysisResult(sessionId, { [partKey]: content });
      },
      onError: async (error) => {
        console.error(`[APEX Analysis] Error for session ${sessionId}:`, error);
        await updateAnalysisSessionStatus(sessionId, "failed");
      },
    });

    // Update with full results
    await updateAnalysisResult(sessionId, {
      fullMarkdown: result.fullMarkdown,
      generatedAt: new Date(result.generatedAt),
    });
    await updateAnalysisSessionStatus(sessionId, "completed");
    console.log(`[APEX Analysis] Complete for session ${sessionId}, tokens used: ${result.totalTokens}`);

    // Send email notification
    if (email && isEmailConfigured()) {
      await sendRapidApolloEmail({
        to: email,
        userName: email.split('@')[0],
        magicLinkUrl: `${process.env.VITE_APP_URL || ''}/analysis/${sessionId}`,
        transactionId: sessionId,
        amount: String(getTierPrice("full")),
        currency: 'USD',
        tier: "full",
      });
    }
  } catch (error) {
    console.error(`[APEX Analysis] Failed for session ${sessionId}:`, error);
    await updateAnalysisSessionStatus(sessionId, "failed");
  }
}

export type AppRouter = typeof appRouter;
