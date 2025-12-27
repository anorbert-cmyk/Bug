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
} from "./db";

import { Tier, getTierPrice, getTierConfig, TIER_CONFIGS, isMultiPartTier } from "../shared/pricing";
import { generateAnalysis, generateSingleAnalysis, generateMultiPartAnalysis } from "./services/perplexityService";
import { createPaymentIntent, isStripeConfigured } from "./services/stripeService";
import { createCharge, isCoinbaseConfigured } from "./services/coinbaseService";
import { createOrder as createPayPalOrder, captureOrder as capturePayPalOrder, isPayPalConfigured } from "./services/paypalService";
import { verifyAdminSignature, verifyAdminSignatureWithChallenge, checkAdminStatus, generateChallenge } from "./services/walletAuthService";
import { sendRapidApolloEmail, isEmailConfigured } from "./services/emailService";

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
    createStripeIntent: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        tier: tierSchema,
        problemStatement: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isStripeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured" });
        }

        const result = await createPaymentIntent(input.tier, input.sessionId, input.problemStatement);
        
        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }

        // Create purchase record
        await createPurchase({
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          tier: input.tier,
          amountUsd: getTierPrice(input.tier).toString(),
          paymentMethod: "stripe",
          paymentStatus: "pending",
          stripePaymentIntentId: result.paymentIntentId,
        });

        return {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
        };
      }),

    createCoinbaseCharge: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        tier: tierSchema,
        problemStatement: z.string(),
        walletAddress: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isCoinbaseConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Coinbase Commerce is not configured" });
        }

        const result = await createCharge(
          input.tier,
          input.sessionId,
          input.problemStatement,
          input.walletAddress
        );

        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }

        // Create purchase record
        await createPurchase({
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          tier: input.tier,
          amountUsd: getTierPrice(input.tier).toString(),
          paymentMethod: "coinbase",
          paymentStatus: "pending",
          coinbaseChargeId: result.chargeId,
          coinbaseChargeCode: result.code,
          walletAddress: input.walletAddress,
        });

        return {
          chargeId: result.chargeId,
          code: result.code,
          hostedUrl: result.hostedUrl,
        };
      }),

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
        const { challenge, timestamp } = generateChallenge(input.walletAddress);
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
  }),

  // ============ CONFIG ============
  config: router({
    getPaymentConfig: publicProcedure.query(() => {
      return {
        stripeEnabled: isStripeConfigured(),
        coinbaseEnabled: isCoinbaseConfigured(),
        paypalEnabled: isPayPalConfigured(),
        stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
      };
    }),
  }),
});

// Background analysis function
async function startAnalysisInBackground(sessionId: string, problemStatement: string, tier: Tier, email?: string | null) {
  try {
    console.log(`[Analysis] Starting ${tier} analysis for session ${sessionId}`);

    if (isMultiPartTier(tier)) {
      // Multi-part analysis for full tier
      const result = await generateMultiPartAnalysis(problemStatement, {
        onPartComplete: async (partNum, content) => {
          console.log(`[Analysis] Part ${partNum} complete for session ${sessionId}`);
          const partKey = `part${partNum}` as "part1" | "part2" | "part3" | "part4";
          await updateAnalysisResult(sessionId, { [partKey]: content });
        },
        onComplete: async (result) => {
          await updateAnalysisResult(sessionId, {
            fullMarkdown: result.fullMarkdown,
            generatedAt: new Date(result.generatedAt),
          });
          await updateAnalysisSessionStatus(sessionId, "completed");
          console.log(`[Analysis] Multi-part analysis complete for session ${sessionId}`);
          
          // Send email notification
          if (email && isEmailConfigured()) {
            const tierConfig = getTierConfig(tier);
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
          await updateAnalysisSessionStatus(sessionId, "failed");
        },
      });
    } else {
      // Single analysis for standard/medium tier
      const result = await generateSingleAnalysis(problemStatement, tier as "standard" | "medium");
      await updateAnalysisResult(sessionId, {
        singleResult: result.content,
        generatedAt: new Date(result.generatedAt),
      });
      await updateAnalysisSessionStatus(sessionId, "completed");
      console.log(`[Analysis] Single analysis complete for session ${sessionId}`);
      
      // Send email notification
      if (email && isEmailConfigured()) {
        const tierConfig = getTierConfig(tier);
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
    console.error(`[Analysis] Failed for session ${sessionId}:`, error);
    await updateAnalysisSessionStatus(sessionId, "failed");
  }
}

export type AppRouter = typeof appRouter;
