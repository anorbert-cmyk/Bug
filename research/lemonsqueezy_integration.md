# LemonSqueezy Integration Research

## Overview
LemonSqueezy is a Merchant of Record (MoR) platform that handles payments, subscriptions, and global tax compliance.

## Key Integration Points

### 1. Checkout Flow
- **Checkout URL Structure**: `https://[STORE].lemonsqueezy.com/checkout/buy/[VARIANT_ID]`
- **Two display options**:
  - Hosted Checkout: Opens in new browser tab
  - Checkout Overlay: Displays in iframe over current page (using Lemon.js)

### 2. API Checkout Creation
```bash
POST https://api.lemonsqueezy.com/v1/checkouts
Headers:
  - Accept: application/vnd.api+json
  - Content-Type: application/vnd.api+json
  - Authorization: Bearer {api_key}

Body:
{
  "data": {
    "type": "checkouts",
    "attributes": {
      "checkout_data": {
        "email": "customer@example.com",
        "name": "Customer Name",
        "custom": {
          "session_id": "abc123"  // Our session ID for tracking
        }
      }
    },
    "relationships": {
      "store": {
        "data": {
          "type": "stores",
          "id": "STORE_ID"
        }
      },
      "variant": {
        "data": {
          "type": "variants",
          "id": "VARIANT_ID"
        }
      }
    }
  }
}
```

### 3. Webhook Events
Key events for our use case:
- `order_created` - One-time payment completed
- `order_refunded` - Payment refunded

### 4. Webhook Signature Verification
- Signature sent in `X-Signature` header
- HMAC hash of signing secret + request body
- Must verify to ensure request is from LemonSqueezy

### 5. Custom Data
- Pass `session_id` in `checkout_data.custom`
- Received back in webhook as `meta.custom_data`

## Required Environment Variables
- `LEMONSQUEEZY_API_KEY` - API key for creating checkouts
- `LEMONSQUEEZY_STORE_ID` - Store ID
- `LEMONSQUEEZY_WEBHOOK_SECRET` - For verifying webhook signatures
- `LEMONSQUEEZY_VARIANT_OBSERVER` - Variant ID for Observer tier
- `LEMONSQUEEZY_VARIANT_INSIDER` - Variant ID for Insider tier
- `LEMONSQUEEZY_VARIANT_SYNDICATE` - Variant ID for Syndicate tier

## Implementation Plan

### Backend Changes
1. Create `server/services/lemonSqueezyService.ts`
2. Add webhook endpoint `/api/webhooks/lemonsqueezy`
3. Update `server/routers.ts` to use LemonSqueezy instead of Stripe

### Frontend Changes
1. Update checkout flow to redirect to LemonSqueezy checkout URL
2. Or use Lemon.js for overlay checkout

### Database Changes
- No schema changes needed (payment_method already supports different values)
