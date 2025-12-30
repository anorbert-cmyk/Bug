/**
 * Webhook handlers for LemonSqueezy and Coinbase Commerce
 */

import { Router, Request, Response } from "express";
import { verifyWebhookSignature as verifyLemonSqueezySignature, parseWebhookEvent as parseLemonSqueezyEvent } from "./services/lemonSqueezyService";
import { verifyWebhookSignature as verifyCoinbaseSignature } from "./services/coinbaseService";
import { 
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
 * LemonSqueezy Webhook Handler
 */
webhookRouter.post("/lemonsqueezy", async (req: Request, res: Response) => {
  const signature = req.headers["x-signature"] as string;
  
  if (!signature) {
    console.error("[LemonSqueezy Webhook] Missing signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  // Get raw body for signature verification
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  
  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    console.error("[LemonSqueezy Webhook] Invalid signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = parseLemonSqueezyEvent(rawBody);
  if (!event) {
    console.error("[LemonSqueezy Webhook] Failed to parse event");
    return res.status(400).json({ error: "Invalid event payload" });
  }

  console.log("[LemonSqueezy Webhook] Received event:", event.meta.event_name);

  try {
    const customData = event.meta.custom_data;
    const sessionId = customData?.session_id;

    if (!sessionId) {
      console.error("[LemonSqueezy Webhook] Missing session_id in custom_data");
      return res.status(400).json({ error: "Missing session_id" });
    }

    switch (event.meta.event_name) {
      case "order_created": {
        // Payment completed - order was created successfully
        await updatePurchaseStatus(sessionId, "completed", new Date());
        console.log("[LemonSqueezy Webhook] Payment completed for session:", sessionId);
        
        // Start analysis
        await startAnalysisAfterPayment(sessionId);
        break;
      }

      case "order_refunded": {
        // Payment was refunded
        await updatePurchaseStatus(sessionId, "refunded");
        await updateAnalysisSessionStatus(sessionId, "failed");
        console.log("[LemonSqueezy Webhook] Payment refunded for session:", sessionId);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[LemonSqueezy Webhook] Error processing event:", error);
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
