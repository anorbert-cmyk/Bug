/**
 * Webhook handlers for Stripe and Coinbase Commerce
 */

import { Router, Request, Response } from "express";
import { verifyWebhookSignature as verifyStripeSignature } from "./services/stripeService";
import { verifyWebhookSignature as verifyCoinbaseSignature } from "./services/coinbaseService";
import { 
  getPurchaseByStripePaymentIntent, 
  getPurchaseByCoinbaseChargeId,
  updatePurchaseStatus,
  updateAnalysisSessionStatus,
  getAnalysisSessionById,
  createAnalysisResult,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { getTierConfig, getTierPrice, isMultiPartTier } from "../shared/pricing";
import { generateSingleAnalysis, generateMultiPartAnalysis } from "./services/perplexityService";
import { updateAnalysisResult, getUserById } from "./db";
import { sendRapidApolloEmail, isEmailConfigured } from "./services/emailService";

const webhookRouter = Router();

/**
 * Stripe Webhook Handler
 */
webhookRouter.post("/stripe", async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  
  if (!signature) {
    console.error("[Stripe Webhook] Missing signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  // Get raw body for signature verification
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  
  const event = verifyStripeSignature(rawBody, signature);
  if (!event) {
    console.error("[Stripe Webhook] Invalid signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  console.log("[Stripe Webhook] Received event:", event.type);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as any;
        const purchase = await getPurchaseByStripePaymentIntent(paymentIntent.id);
        
        if (purchase) {
          await updatePurchaseStatus(purchase.sessionId, "completed", new Date());
          console.log("[Stripe Webhook] Payment completed for session:", purchase.sessionId);
          
          // Start analysis
          await startAnalysisAfterPayment(purchase.sessionId);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as any;
        const purchase = await getPurchaseByStripePaymentIntent(paymentIntent.id);
        
        if (purchase) {
          await updatePurchaseStatus(purchase.sessionId, "failed");
          await updateAnalysisSessionStatus(purchase.sessionId, "failed");
          console.log("[Stripe Webhook] Payment failed for session:", purchase.sessionId);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Coinbase Commerce Webhook Handler
 */
webhookRouter.post("/coinbase", async (req: Request, res: Response) => {
  const signature = req.headers["x-cc-webhook-signature"] as string;
  
  if (!signature) {
    console.error("[Coinbase Webhook] Missing signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  
  if (!verifyCoinbaseSignature(rawBody, signature)) {
    console.error("[Coinbase Webhook] Invalid signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;
  console.log("[Coinbase Webhook] Received event:", event.type);

  try {
    switch (event.type) {
      case "charge:confirmed":
      case "charge:completed": {
        const charge = event.data;
        const purchase = await getPurchaseByCoinbaseChargeId(charge.id);
        
        if (purchase) {
          // Extract crypto amount if available
          const cryptoPayment = charge.payments?.[0];
          if (cryptoPayment) {
            // Update with crypto details if needed
          }
          
          await updatePurchaseStatus(purchase.sessionId, "completed", new Date());
          console.log("[Coinbase Webhook] Payment completed for session:", purchase.sessionId);
          
          // Start analysis
          await startAnalysisAfterPayment(purchase.sessionId);
        }
        break;
      }

      case "charge:failed": {
        const charge = event.data;
        const purchase = await getPurchaseByCoinbaseChargeId(charge.id);
        
        if (purchase) {
          await updatePurchaseStatus(purchase.sessionId, "failed");
          await updateAnalysisSessionStatus(purchase.sessionId, "failed");
          console.log("[Coinbase Webhook] Payment failed for session:", purchase.sessionId);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Coinbase Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Start analysis after successful payment
 */
async function startAnalysisAfterPayment(sessionId: string) {
  try {
    const session = await getAnalysisSessionById(sessionId);
    if (!session) {
      console.error("[Analysis] Session not found:", sessionId);
      return;
    }

    // Update session status
    await updateAnalysisSessionStatus(sessionId, "processing");

    // Create initial result record
    await createAnalysisResult({
      sessionId,
      userId: session.userId,
      tier: session.tier,
      problemStatement: session.problemStatement,
    });

    // Notify owner
    const tierConfig = getTierConfig(session.tier);
    await notifyOwner({
      title: `New ${tierConfig?.displayName || session.tier} Purchase`,
      content: `A new analysis has been purchased.\n\nTier: ${tierConfig?.displayName}\nAmount: $${getTierPrice(session.tier)}\nProblem: ${session.problemStatement.substring(0, 200)}...`,
    });

    // Get user email for notification
    let userEmail = session.email;
    if (!userEmail && session.userId) {
      const user = await getUserById(session.userId);
      userEmail = user?.email || null;
    }

    // Start analysis in background
    if (isMultiPartTier(session.tier)) {
      generateMultiPartAnalysis(session.problemStatement, {
        onPartComplete: async (partNum, content) => {
          const partKey = `part${partNum}` as "part1" | "part2" | "part3" | "part4";
          await updateAnalysisResult(sessionId, { [partKey]: content });
        },
        onComplete: async (result) => {
          await updateAnalysisResult(sessionId, {
            fullMarkdown: result.fullMarkdown,
            generatedAt: new Date(result.generatedAt),
          });
          await updateAnalysisSessionStatus(sessionId, "completed");
          
          // Send email notification with magic link
          if (userEmail && isEmailConfigured()) {
            const appUrl = process.env.VITE_APP_URL || 'https://rapidapollo.com';
            await sendRapidApolloEmail({
              to: userEmail,
              userName: userEmail.split('@')[0],
              magicLinkUrl: `${appUrl}/analysis/${sessionId}`,
              transactionId: sessionId,
              amount: String(getTierPrice(session.tier)),
              currency: 'USD',
              tier: session.tier,
            });
            console.log(`[Webhook] Email sent to ${userEmail} for session ${sessionId}`);
          }
        },
        onError: async () => {
          await updateAnalysisSessionStatus(sessionId, "failed");
        },
      });
    } else {
      const result = await generateSingleAnalysis(session.problemStatement, session.tier as "standard" | "medium");
      await updateAnalysisResult(sessionId, {
        singleResult: result.content,
        generatedAt: new Date(result.generatedAt),
      });
      await updateAnalysisSessionStatus(sessionId, "completed");
      
      // Send email notification with magic link
      if (userEmail && isEmailConfigured()) {
        const appUrl = process.env.VITE_APP_URL || 'https://rapidapollo.com';
        await sendRapidApolloEmail({
          to: userEmail,
          userName: userEmail.split('@')[0],
          magicLinkUrl: `${appUrl}/analysis/${sessionId}`,
          transactionId: sessionId,
          amount: String(getTierPrice(session.tier)),
          currency: 'USD',
          tier: session.tier,
        });
        console.log(`[Webhook] Email sent to ${userEmail} for session ${sessionId}`);
      }
    }
  } catch (error) {
    console.error("[Analysis] Failed to start analysis:", error);
    await updateAnalysisSessionStatus(sessionId, "failed");
  }
}

export default webhookRouter;
