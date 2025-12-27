/**
 * PayPal Payment Service
 * Handles PayPal order creation and webhook verification
 */

import crypto from "crypto";
import { Tier, getTierPrice, getTierConfig } from "../../shared/pricing";

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === "live" 
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get PayPal access token (cached)
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`PayPal auth failed: ${(errorData as any).error_description || response.status}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

export interface PayPalOrderResult {
  success: boolean;
  orderId?: string;
  approvalUrl?: string;
  error?: string;
}

/**
 * Create a PayPal order for the given tier
 */
export async function createOrder(
  tier: Tier,
  sessionId: string,
  problemStatement: string
): Promise<PayPalOrderResult> {
  if (!isPayPalConfigured()) {
    return {
      success: false,
      error: "PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
    };
  }

  try {
    const accessToken = await getAccessToken();
    const priceUsd = getTierPrice(tier);
    const tierConfig = getTierConfig(tier);

    if (!tierConfig) {
      return { success: false, error: "Invalid tier" };
    }

    const baseUrl = process.env.VITE_APP_URL || process.env.ALLOWED_ORIGIN || "http://localhost:3000";

    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: sessionId,
          description: `${tierConfig.displayName} - AI Strategic UX Analysis`,
          custom_id: JSON.stringify({
            tier,
            sessionId,
            problemStatement: problemStatement.substring(0, 100),
          }),
          amount: {
            currency_code: "USD",
            value: priceUsd.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "Aether Logic",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: `${baseUrl}/payment/success?session=${sessionId}&provider=paypal`,
        cancel_url: `${baseUrl}/payment/cancel?session=${sessionId}`,
      },
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `${sessionId}-${Date.now()}`, // Idempotency key
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).message || `HTTP ${response.status}`);
    }

    const order = await response.json() as { 
      id: string; 
      links: Array<{ rel: string; href: string }>;
    };

    const approvalLink = order.links.find(link => link.rel === "approve");

    console.log("[PayPal] Order created:", order.id);

    return {
      success: true,
      orderId: order.id,
      approvalUrl: approvalLink?.href,
    };
  } catch (error: any) {
    console.error("[PayPal] Failed to create order:", error);
    return {
      success: false,
      error: error.message || "Failed to create PayPal order",
    };
  }
}

/**
 * Capture a PayPal order after approval
 */
export async function captureOrder(orderId: string): Promise<{
  success: boolean;
  captureId?: string;
  status?: string;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).message || `HTTP ${response.status}`);
    }

    const capture = await response.json() as {
      id: string;
      status: string;
      purchase_units: Array<{
        payments: {
          captures: Array<{ id: string; status: string }>;
        };
      }>;
    };

    const captureId = capture.purchase_units[0]?.payments?.captures[0]?.id;

    console.log("[PayPal] Order captured:", orderId, "Capture ID:", captureId);

    return {
      success: true,
      captureId,
      status: capture.status,
    };
  } catch (error: any) {
    console.error("[PayPal] Failed to capture order:", error);
    return {
      success: false,
      error: error.message || "Failed to capture PayPal order",
    };
  }
}

/**
 * Get order details
 */
export async function getOrder(orderId: string): Promise<any | null> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("[PayPal] Failed to get order:", error);
    return null;
  }
}

/**
 * Verify PayPal webhook signature
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[PayPal] Webhook ID not configured");
    return false;
  }

  try {
    const accessToken = await getAccessToken();

    const verificationData = {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationData),
    });

    if (!response.ok) return false;

    const result = await response.json() as { verification_status: string };
    return result.verification_status === "SUCCESS";
  } catch (error) {
    console.error("[PayPal] Webhook verification failed:", error);
    return false;
  }
}

/**
 * Check if PayPal is configured
 */
export function isPayPalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}
