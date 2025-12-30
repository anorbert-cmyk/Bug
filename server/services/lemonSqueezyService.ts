/**
 * LemonSqueezy Payment Service
 * Handles checkout creation and webhook verification
 */

import crypto from "crypto";
import { Tier, getTierPrice, getTierConfig } from "../../shared/pricing";

interface CreateCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

interface LemonSqueezyCheckoutResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      variant_id: number;
      url: string;
      expires_at: string | null;
    };
  };
}

/**
 * Get the variant ID for a given tier
 */
function getVariantId(tier: Tier): string {
  // Map tier IDs to LemonSqueezy variant environment variables
  // standard = Observer, medium = Insider, full = Syndicate
  const variantMap: Record<Tier, string | undefined> = {
    standard: process.env.LEMONSQUEEZY_VARIANT_OBSERVER,
    medium: process.env.LEMONSQUEEZY_VARIANT_INSIDER,
    full: process.env.LEMONSQUEEZY_VARIANT_SYNDICATE,
  };
  
  const variantId = variantMap[tier];
  if (!variantId) {
    throw new Error(`LemonSqueezy variant ID not configured for tier: ${tier}`);
  }
  return variantId;
}

/**
 * Create a LemonSqueezy checkout for the given tier
 */
export async function createCheckout(
  tier: Tier,
  sessionId: string,
  problemStatement: string,
  customerEmail?: string,
  isPriority?: boolean,
  prioritySource?: string
): Promise<CreateCheckoutResult> {
  try {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    
    if (!apiKey || !storeId) {
      throw new Error("LemonSqueezy API key or store ID not configured");
    }

    const variantId = getVariantId(tier);
    const tierConfig = getTierConfig(tier);
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    // Build checkout data with custom fields for tracking
    // All custom fields MUST be strings for LemonSqueezy API
    const customData: Record<string, string> = {
      session_id: String(sessionId),
      tier: String(tier),
      is_priority: isPriority ? "true" : "false",
    };
    
    // Only add priority_source if it's a non-empty string
    if (prioritySource && typeof prioritySource === "string" && prioritySource.trim() !== "") {
      customData.priority_source = prioritySource;
    }

    const checkoutData: any = {
      custom: customData,
    };

    // Pre-fill customer email if provided
    if (customerEmail) {
      checkoutData.email = customerEmail;
    }

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: checkoutData,
            product_options: {
              name: `APEX Analysis - ${tierConfig.displayName}`,
              description: problemStatement.substring(0, 200),
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: storeId,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[LemonSqueezy] API error:", errorText);
      throw new Error(`LemonSqueezy API error: ${response.status}`);
    }

    const result: LemonSqueezyCheckoutResponse = await response.json();
    
    console.log("[LemonSqueezy] Checkout created:", result.data.id);

    return {
      success: true,
      checkoutUrl: result.data.attributes.url,
    };
  } catch (error: any) {
    console.error("[LemonSqueezy] Failed to create checkout:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verify LemonSqueezy webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[LemonSqueezy] Webhook secret not configured");
    return false;
  }

  try {
    const payloadString = typeof payload === "string" ? payload : payload.toString();
    const hmac = crypto.createHmac("sha256", webhookSecret);
    const digest = hmac.update(payloadString).digest("hex");
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error: any) {
    console.error("[LemonSqueezy] Webhook signature verification failed:", error.message);
    return false;
  }
}

/**
 * Parse LemonSqueezy webhook event
 */
export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: {
      session_id?: string;
      tier?: string;
      is_priority?: string;
      priority_source?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id?: number;
      status: string;
      status_formatted: string;
      user_name: string;
      user_email: string;
      total: number;
      total_formatted: string;
      currency: string;
      refunded: boolean;
      refunded_at: string | null;
      created_at: string;
      updated_at: string;
    };
  };
}

export function parseWebhookEvent(payload: string): LemonSqueezyWebhookEvent | null {
  try {
    return JSON.parse(payload) as LemonSqueezyWebhookEvent;
  } catch (error) {
    console.error("[LemonSqueezy] Failed to parse webhook payload:", error);
    return null;
  }
}

/**
 * Check if LemonSqueezy is configured
 */
export function isLemonSqueezyConfigured(): boolean {
  return !!(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_VARIANT_OBSERVER &&
    process.env.LEMONSQUEEZY_VARIANT_INSIDER &&
    process.env.LEMONSQUEEZY_VARIANT_SYNDICATE
  );
}
