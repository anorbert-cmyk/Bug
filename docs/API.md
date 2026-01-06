# API Documentation

This document provides comprehensive reference for the ValidateStrategy API, including authentication, tRPC procedures, webhook endpoints, and integration patterns.

## API Architecture

ValidateStrategy uses **tRPC** for type-safe API communication between the frontend and backend. All procedures are defined in `server/routers.ts` and automatically generate TypeScript types for the client. The API follows a procedure-based architecture where each endpoint is either a **query** (read operation) or **mutation** (write operation).

### Base URL

All tRPC procedures are accessed through the `/api/trpc` endpoint. The frontend client automatically handles request routing and type inference.

### Authentication

The API supports two authentication methods: Manus OAuth for regular users and MetaMask wallet signatures for admin access.

**Manus OAuth Flow:** Users authenticate through the Manus OAuth portal, which redirects to `/api/oauth/callback` with an authorization code. The backend exchanges this code for a JWT token, which is stored in an HttpOnly cookie. All subsequent requests include this cookie for authentication.

**MetaMask Admin Flow:** Admin users connect their MetaMask wallet and sign a challenge message. The backend verifies the signature against the configured admin wallet address and issues a JWT token with admin privileges. Admin tokens expire after 30 minutes of inactivity.

## tRPC Procedures

### Authentication Procedures

#### `auth.me`

**Type:** Query  
**Authentication:** Optional  
**Description:** Returns the currently authenticated user's profile information.

**Response:**
```typescript
{
  openId: string;
  name: string;
  email?: string;
  role: "admin" | "user";
}
```

**Example Usage:**
```typescript
const { data: user } = trpc.auth.me.useQuery();
```

#### `auth.logout`

**Type:** Mutation  
**Authentication:** Required  
**Description:** Invalidates the current session and clears authentication cookies.

**Response:**
```typescript
{ success: boolean }
```

**Example Usage:**
```typescript
const logout = trpc.auth.logout.useMutation();
await logout.mutateAsync();
```

#### `auth.adminChallenge`

**Type:** Query  
**Authentication:** None  
**Description:** Generates a challenge message for MetaMask wallet signature verification.

**Response:**
```typescript
{
  challenge: string;
  timestamp: number;
}
```

**Example Usage:**
```typescript
const { data } = trpc.auth.adminChallenge.useQuery();
const signature = await ethereum.request({
  method: "personal_sign",
  params: [data.challenge, walletAddress]
});
```

#### `auth.adminVerify`

**Type:** Mutation  
**Authentication:** None  
**Description:** Verifies a MetaMask wallet signature and issues an admin JWT token if the wallet address matches the configured admin address.

**Input:**
```typescript
{
  walletAddress: string;
  signature: string;
  challenge: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  isAdmin: boolean;
  token?: string;
}
```

**Example Usage:**
```typescript
const verify = trpc.auth.adminVerify.useMutation();
const result = await verify.mutateAsync({
  walletAddress,
  signature,
  challenge
});
```

### Analysis Session Procedures

#### `session.create`

**Type:** Mutation  
**Authentication:** Optional  
**Description:** Creates a new analysis session with a problem statement and selected tier. Returns a session ID used for payment and result retrieval.

**Input:**
```typescript
{
  problemStatement: string;
  tier: "standard" | "medium" | "full";
  email?: string;
  prioritySource?: string;
}
```

**Response:**
```typescript
{
  sessionId: string;
  tier: string;
  createdAt: Date;
}
```

**Example Usage:**
```typescript
const createSession = trpc.session.create.useMutation();
const session = await createSession.mutateAsync({
  problemStatement: "How can I improve user onboarding?",
  tier: "full",
  email: "user@example.com"
});
```

#### `session.getById`

**Type:** Query  
**Authentication:** Optional  
**Description:** Retrieves an analysis session by ID, including problem statement, tier, status, and analysis results if completed.

**Input:**
```typescript
{ sessionId: string }
```

**Response:**
```typescript
{
  id: string;
  problemStatement: string;
  tier: "standard" | "medium" | "full";
  status: "pending" | "processing" | "completed" | "failed";
  email?: string;
  walletAddress?: string;
  part1?: string;
  part2?: string;
  part3?: string;
  part4?: string;
  part5?: string;
  part6?: string;
  fullMarkdown?: string;
  generatedAt?: Date;
  estimatedCompletion?: Date;
  progress?: {
    part1: "pending" | "in_progress" | "completed" | "failed";
    part2: "pending" | "in_progress" | "completed" | "failed";
    part3: "pending" | "in_progress" | "completed" | "failed";
    part4: "pending" | "in_progress" | "completed" | "failed";
    part5: "pending" | "in_progress" | "completed" | "failed";
    part6: "pending" | "in_progress" | "completed" | "failed";
  };
}
```

**Example Usage:**
```typescript
const { data: session } = trpc.session.getById.useQuery({
  sessionId: "abc123"
});
```

#### `session.getUserSessions`

**Type:** Query  
**Authentication:** Required  
**Description:** Returns all analysis sessions for the authenticated user, ordered by creation date descending.

**Response:**
```typescript
Array<{
  id: string;
  problemStatement: string;
  tier: string;
  status: string;
  createdAt: Date;
  generatedAt?: Date;
}>
```

**Example Usage:**
```typescript
const { data: sessions } = trpc.session.getUserSessions.useQuery();
```

### Payment Procedures

#### `payment.createLemonSqueezyCheckout`

**Type:** Mutation  
**Authentication:** Optional  
**Description:** Creates a LemonSqueezy checkout session for credit card payments.

**Input:**
```typescript
{
  sessionId: string;
  tier: "standard" | "medium" | "full";
  email: string;
}
```

**Response:**
```typescript
{
  checkoutUrl: string;
}
```

**Example Usage:**
```typescript
const createCheckout = trpc.payment.createLemonSqueezyCheckout.useMutation();
const { checkoutUrl } = await createCheckout.mutateAsync({
  sessionId: session.id,
  tier: "full",
  email: "user@example.com"
});
window.location.href = checkoutUrl;
```

#### `payment.createNOWPayment`

**Type:** Mutation  
**Authentication:** Optional  
**Description:** Creates a NOWPayments cryptocurrency payment.

**Input:**
```typescript
{
  sessionId: string;
  tier: "standard" | "medium" | "full";
  email: string;
}
```

**Response:**
```typescript
{
  paymentId: string;
  paymentUrl: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
}
```

**Example Usage:**
```typescript
const createPayment = trpc.payment.createNOWPayment.useMutation();
const payment = await createPayment.mutateAsync({
  sessionId: session.id,
  tier: "full",
  email: "user@example.com"
});
window.location.href = payment.paymentUrl;
```

#### `payment.confirmAndStartAnalysis`

**Type:** Mutation  
**Authentication:** Optional  
**Description:** Confirms payment and triggers analysis generation. This is typically called by webhook handlers after payment verification.

**Input:**
```typescript
{
  sessionId: string;
  paymentProvider: "lemonsqueezy" | "nowpayments" | "paypal";
  transactionId: string;
  amount: number;
  currency: string;
  email?: string;
  walletAddress?: string;
}
```

**Response:**
```typescript
{ success: boolean }
```

### Email Subscription Procedures

#### `emailSubscriber.subscribe`

**Type:** Mutation  
**Authentication:** None  
**Description:** Subscribes an email address to the demo user nurture sequence. Includes honeypot spam protection.

**Input:**
```typescript
{
  email: string;
  source: "demo" | "homepage" | "other";
  honeypot?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Example Usage:**
```typescript
const subscribe = trpc.emailSubscriber.subscribe.useMutation();
await subscribe.mutateAsync({
  email: "user@example.com",
  source: "demo"
});
```

#### `emailSubscriber.getAll`

**Type:** Query  
**Authentication:** Admin only  
**Description:** Returns all email subscribers with their subscription date and source.

**Response:**
```typescript
Array<{
  id: number;
  email: string;
  source: string;
  subscribedAt: Date;
}>
```

**Example Usage:**
```typescript
const { data: subscribers } = trpc.emailSubscriber.getAll.useQuery();
```

### Admin Procedures

#### `admin.getStats`

**Type:** Query  
**Authentication:** Admin only  
**Description:** Returns comprehensive business analytics including revenue, tier distribution, and conversion metrics.

**Response:**
```typescript
{
  totalRevenue: {
    usd: number;
    eth: number;
  };
  tierDistribution: {
    standard: number;
    medium: number;
    full: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    tier: string;
    walletAddress?: string;
    createdAt: Date;
  }>;
  conversionFunnel: {
    sessions: number;
    payments: number;
    completions: number;
  };
}
```

**Example Usage:**
```typescript
const { data: stats } = trpc.admin.getStats.useQuery();
```

## Webhook Endpoints

Webhook endpoints handle asynchronous payment confirmations from external providers. All webhooks verify cryptographic signatures before processing.

### LemonSqueezy Webhook

**Endpoint:** `POST /api/webhooks/lemonsqueezy`  
**Authentication:** Signature verification via `X-Signature` header  
**Description:** Processes LemonSqueezy payment events including order creation, payment success, and subscription updates.

**Request Headers:**
```
X-Signature: HMAC-SHA256 signature of request body
Content-Type: application/json
```

**Request Body:**
```json
{
  "meta": {
    "event_name": "order_created",
    "custom_data": {
      "session_id": "abc123",
      "tier": "full"
    }
  },
  "data": {
    "id": "order_123",
    "attributes": {
      "total": 199,
      "currency": "USD",
      "user_email": "user@example.com",
      "status": "paid"
    }
  }
}
```

**Response:**
```json
{ "received": true }
```

**Signature Verification:**
```typescript
const signature = request.headers["x-signature"];
const body = JSON.stringify(request.body);
const expectedSignature = crypto
  .createHmac("sha256", LEMONSQUEEZY_WEBHOOK_SECRET)
  .update(body)
  .digest("hex");
const isValid = signature === expectedSignature;
```

### NOWPayments Webhook

**Endpoint:** `POST /api/webhooks/nowpayments`  
**Authentication:** Signature verification via `x-nowpayments-sig` header  
**Description:** Processes NOWPayments IPN notifications for cryptocurrency payment status updates.

**Request Headers:**
```
x-nowpayments-sig: HMAC-SHA512 signature of request body
Content-Type: application/json
```

**Request Body:**
```json
{
  "payment_id": "payment_123",
  "payment_status": "finished",
  "pay_amount": 0.005,
  "pay_currency": "BTC",
  "price_amount": 199,
  "price_currency": "USD",
  "order_id": "session_abc123",
  "order_description": "Syndicate Tier Analysis"
}
```

**Response:**
```json
{ "received": true }
```

**Signature Verification:**
```typescript
const signature = request.headers["x-nowpayments-sig"];
const body = JSON.stringify(request.body);
const expectedSignature = crypto
  .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
  .update(body)
  .digest("hex");
const isValid = signature === expectedSignature;
```

### PayPal Webhook

**Endpoint:** `POST /api/webhooks/paypal`  
**Authentication:** Signature verification via PayPal SDK  
**Description:** Processes PayPal payment events including order completion and refunds.

**Request Headers:**
```
PAYPAL-TRANSMISSION-ID: unique-transmission-id
PAYPAL-TRANSMISSION-TIME: 2025-01-06T12:00:00Z
PAYPAL-TRANSMISSION-SIG: signature
PAYPAL-CERT-URL: https://api.paypal.com/cert
PAYPAL-AUTH-ALGO: SHA256withRSA
Content-Type: application/json
```

**Request Body:**
```json
{
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "capture_123",
    "amount": {
      "value": "199.00",
      "currency_code": "USD"
    },
    "custom_id": "session_abc123"
  }
}
```

**Response:**
```json
{ "received": true }
```

## Email Tracking

### Email Open Tracking Pixel

**Endpoint:** `GET /api/track/email-open`  
**Authentication:** None  
**Description:** Tracks email opens through a 1x1 transparent pixel embedded in email templates.

**Query Parameters:**
```
email: user@example.com (URL-encoded)
sequence: 1 | 2 | 3 | 4
```

**Response:** 1x1 transparent PNG image

**Example Usage in Email:**
```html
<img src="https://yourdomain.com/api/track/email-open?email=user%40example.com&sequence=1" width="1" height="1" alt="" />
```

## Rate Limiting

All API endpoints implement rate limiting to prevent abuse. The default limits are:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| Session Creation | 5 requests | 1 hour |
| Payment Creation | 3 requests | 1 hour |
| General Queries | 100 requests | 15 minutes |
| Admin Endpoints | 50 requests | 15 minutes |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704556800
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages in a consistent format.

**Error Response Structure:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "field": "token",
      "reason": "expired"
    }
  }
}
```

**Common Error Codes:**

| Code | HTTP Status | Description |
|------|------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

## Integration Examples

### Complete Payment Flow

```typescript
// 1. Create analysis session
const createSession = trpc.session.create.useMutation();
const session = await createSession.mutateAsync({
  problemStatement: "How can I improve user retention?",
  tier: "full",
  email: "user@example.com"
});

// 2. Create payment
const createCheckout = trpc.payment.createLemonSqueezyCheckout.useMutation();
const { checkoutUrl } = await createCheckout.mutateAsync({
  sessionId: session.sessionId,
  tier: "full",
  email: "user@example.com"
});

// 3. Redirect to payment
window.location.href = checkoutUrl;

// 4. After payment, webhook triggers analysis
// 5. Poll for results
const { data: result } = trpc.session.getById.useQuery(
  { sessionId: session.sessionId },
  { refetchInterval: 5000 }
);
```

### Real-Time Progress Tracking

```typescript
// Poll for analysis progress
const { data: session } = trpc.session.getById.useQuery(
  { sessionId },
  { 
    refetchInterval: (data) => {
      // Stop polling when completed or failed
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      // Poll every 5 seconds during processing
      return 5000;
    }
  }
);

// Display progress
if (session?.progress) {
  const completedParts = Object.values(session.progress)
    .filter(status => status === "completed").length;
  const totalParts = session.tier === "full" ? 6 : session.tier === "medium" ? 2 : 1;
  const progress = (completedParts / totalParts) * 100;
}
```

### Admin Dashboard Data

```typescript
// Fetch admin statistics
const { data: stats } = trpc.admin.getStats.useQuery();

// Display revenue
console.log(`Total Revenue: $${stats.totalRevenue.usd}`);
console.log(`ETH Revenue: ${stats.totalRevenue.eth} ETH`);

// Display tier distribution
const tierChart = {
  labels: ["Observer", "Insider", "Syndicate"],
  data: [
    stats.tierDistribution.standard,
    stats.tierDistribution.medium,
    stats.tierDistribution.full
  ]
};

// Display conversion funnel
const conversionRate = (stats.conversionFunnel.payments / stats.conversionFunnel.sessions) * 100;
console.log(`Conversion Rate: ${conversionRate.toFixed(2)}%`);
```

## API Versioning

The current API version is **v1**. All endpoints are unversioned and maintain backward compatibility. Breaking changes will be introduced through a new API version with a deprecation period for the previous version.

## Support

For API support, integration assistance, or bug reports, please contact the development team through GitHub issues or email api-support@validatestrategy.com.

---

**Last Updated:** January 6, 2025  
**API Version:** 1.0.0
