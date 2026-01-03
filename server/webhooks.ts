/**
 * Webhook handlers for NOWPayments (primary crypto payment)
 * LemonSqueezy is commented out until company is established
 */

import { Router, Request, Response } from "express";
import { 
  verifyIPNSignature, 
  parseIPNPayload, 
  isPaymentConfirmed,
  isPaymentFailed,
  PAYMENT_STATUS_DESCRIPTIONS 
} from "./services/nowPaymentsService";
import { 
  updatePurchaseStatus,
  updateAnalysisSessionStatus,
  getAnalysisSessionById,
  createAnalysisResult,
  getPurchaseBySessionId,
  isWebhookProcessed,
  markWebhookProcessed,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { getTierConfig, getTierPrice, isMultiPartTier } from "../shared/pricing";
import { generateSingleAnalysis, generateMultiPartAnalysis } from "./services/perplexityService";
import { updateAnalysisResult, getUserById } from "./db";
import { sendRapidApolloEmail, isEmailConfigured } from "./services/emailService";

const webhookRouter = Router();

/**
 * NOWPayments IPN (Instant Payment Notification) Webhook Handler
 * This is the PRIMARY payment method for crypto payments
 */
webhookRouter.post("/nowpayments", async (req: Request, res: Response) => {
  console.log("[NOWPayments Webhook] Received IPN callback");
  
  const signature = req.headers["x-nowpayments-sig"] as string;
  
  if (!signature) {
    console.error("[NOWPayments Webhook] Missing signature header");
    return res.status(400).json({ error: "Missing signature" });
  }

  // Verify signature
  const payload = req.body;
  if (!verifyIPNSignature(payload, signature)) {
    console.error("[NOWPayments Webhook] Invalid signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    const ipnData = parseIPNPayload(payload);
    const sessionId = ipnData.order_id;
    const paymentStatus = ipnData.payment_status;
    const webhookId = String(ipnData.payment_id);

    console.log(`[NOWPayments Webhook] Payment ${ipnData.payment_id} status: ${paymentStatus} (${PAYMENT_STATUS_DESCRIPTIONS[paymentStatus] || 'Unknown'})`);
    console.log(`[NOWPayments Webhook] Order ID (Session): ${sessionId}`);

    // SECURITY: Check if webhook was already processed (idempotency)
    const alreadyProcessed = await isWebhookProcessed(webhookId);
    
    if (alreadyProcessed) {
      console.log(`[NOWPayments Webhook] Webhook already processed (idempotency): ${webhookId}`);
      return res.json({ received: true, status: paymentStatus, duplicate: true });
    }

    // Only process finished payments - this ensures payment is fully confirmed
    if (isPaymentConfirmed(paymentStatus)) {
      console.log(`[NOWPayments Webhook] Payment CONFIRMED for session: ${sessionId}`);
      
      // Mark webhook as processed BEFORE updating purchase (atomic operation)
      await markWebhookProcessed(webhookId, "nowpayments", sessionId, String(ipnData.payment_id), "completed");
      
      // Update purchase status
      await updatePurchaseStatus(sessionId, "completed", new Date());
      
      // Start the analysis - this is the critical step
      await startAnalysisAfterPayment(sessionId);
      
      console.log(`[NOWPayments Webhook] Analysis started for session: ${sessionId}`);
    } else if (isPaymentFailed(paymentStatus)) {
      console.log(`[NOWPayments Webhook] Payment FAILED for session: ${sessionId}`);
      
      // Mark webhook as processed
      await markWebhookProcessed(webhookId, "nowpayments", sessionId, String(ipnData.payment_id), "failed");
      
      await updatePurchaseStatus(sessionId, "failed");
      await updateAnalysisSessionStatus(sessionId, "failed");
    } else {
      // Payment is still pending (waiting, confirming, etc.)
      console.log(`[NOWPayments Webhook] Payment PENDING for session: ${sessionId} - Status: ${paymentStatus}`);
      // Don't start analysis yet - wait for confirmed status
    }

    // Always respond with 200 to acknowledge receipt
    res.json({ received: true, status: paymentStatus });
  } catch (error) {
    console.error("[NOWPayments Webhook] Error processing IPN:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * LemonSqueezy Webhook Handler - COMMENTED OUT until company is established
 * Uncomment this when ready to accept credit card payments
 */
/*
webhookRouter.post("/lemonsqueezy", async (req: Request, res: Response) => {
  // Import these when enabling:
  // import { verifyWebhookSignature, parseWebhookEvent } from "./services/lemonSqueezyService";
  
  const signature = req.headers["x-signature"] as string;
  
  if (!signature) {
    console.error("[LemonSqueezy Webhook] Missing signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  
  // Verify signature - uncomment when enabling
  // if (!verifyWebhookSignature(rawBody, signature)) {
  //   console.error("[LemonSqueezy Webhook] Invalid signature");
  //   return res.status(400).json({ error: "Invalid signature" });
  // }

  // const event = parseWebhookEvent(rawBody);
  // if (!event) {
  //   console.error("[LemonSqueezy Webhook] Failed to parse event");
  //   return res.status(400).json({ error: "Invalid event payload" });
  // }

  // console.log("[LemonSqueezy Webhook] Received event:", event.meta.event_name);

  try {
    // const customData = event.meta.custom_data;
    // const sessionId = customData?.session_id;

    // if (!sessionId) {
    //   console.error("[LemonSqueezy Webhook] Missing session_id in custom_data");
    //   return res.status(400).json({ error: "Missing session_id" });
    // }

    // switch (event.meta.event_name) {
    //   case "order_created": {
    //     await updatePurchaseStatus(sessionId, "completed", new Date());
    //     await startAnalysisAfterPayment(sessionId);
    //     break;
    //   }
    //   case "order_refunded": {
    //     await updatePurchaseStatus(sessionId, "refunded");
    //     await updateAnalysisSessionStatus(sessionId, "failed");
    //     break;
    //   }
    // }

    res.json({ received: true });
  } catch (error) {
    console.error("[LemonSqueezy Webhook] Error processing event:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
*/

/**
 * Start analysis after successful payment
 * This is called ONLY after payment is fully confirmed
 */
async function startAnalysisAfterPayment(sessionId: string) {
  try {
    const session = await getAnalysisSessionById(sessionId);
    if (!session) {
      console.error("[Analysis] Session not found:", sessionId);
      return;
    }

    // Update session status to processing
    await updateAnalysisSessionStatus(sessionId, "processing");

    // Create initial result record
    await createAnalysisResult({
      sessionId,
      userId: session.userId,
      tier: session.tier,
      problemStatement: session.problemStatement,
    });

    // Notify owner of new purchase
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
