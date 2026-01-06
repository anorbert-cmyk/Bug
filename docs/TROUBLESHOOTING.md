# Troubleshooting Guide

This guide provides solutions to common issues encountered when developing, deploying, or operating the ValidateStrategy platform. Issues are organized by category with diagnostic steps and resolution procedures.

## Database Issues

### Connection Failures

**Symptom:** Application fails to start with error `ECONNREFUSED` or `ER_ACCESS_DENIED_ERROR`.

**Diagnostic Steps:**

Check database connectivity from the application server:

```bash
mysql -h your-db-host -u your-db-user -p your-db-password
```

Verify the DATABASE_URL environment variable is correctly formatted:

```bash
echo $DATABASE_URL
# Should output: mysql://user:password@host:port/database
```

**Common Causes and Solutions:**

**Incorrect Credentials:** Verify username and password in DATABASE_URL match the database user credentials. Reset password if necessary through database provider dashboard.

**Network Restrictions:** Ensure application server IP address is whitelisted in database firewall rules. For cloud databases, add the application's outbound IP to the allowed IP list.

**SSL Requirements:** Many cloud databases require SSL connections. Add `?ssl=true` to DATABASE_URL:

```bash
DATABASE_URL="mysql://user:password@host:port/database?ssl=true"
```

**Connection Pool Exhaustion:** If connections work initially but fail after some time, increase the connection pool size in Drizzle configuration:

```typescript
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 20, // Increase from default 10
});

export const db = drizzle(pool);
```

### Migration Failures

**Symptom:** Database migrations fail with errors about existing tables or columns.

**Diagnostic Steps:**

Check which migrations have been applied:

```bash
pnpm db:check
```

Inspect the database schema directly:

```sql
SHOW TABLES;
DESCRIBE table_name;
```

**Common Causes and Solutions:**

**Partial Migration:** A previous migration may have partially completed. Manually complete the migration or rollback:

```sql
-- Check migration status
SELECT * FROM __drizzle_migrations;

-- Manually rollback last migration
DROP TABLE IF EXISTS new_table;
ALTER TABLE existing_table DROP COLUMN new_column;
```

**Schema Drift:** The database schema doesn't match the Drizzle schema definitions. Generate a new migration to sync:

```bash
pnpm db:generate
pnpm db:push
```

**Permission Issues:** Database user lacks necessary permissions. Grant required privileges:

```sql
GRANT ALL PRIVILEGES ON validatestrategy.* TO 'your_user'@'%';
FLUSH PRIVILEGES;
```

### Slow Queries

**Symptom:** Application responds slowly, database CPU usage is high.

**Diagnostic Steps:**

Enable slow query logging:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

Check for missing indexes:

```sql
EXPLAIN SELECT * FROM analysis_sessions WHERE user_id = 'some-id';
```

**Common Causes and Solutions:**

**Missing Indexes:** Add indexes for frequently queried columns:

```sql
CREATE INDEX idx_analysis_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX idx_analysis_sessions_status ON analysis_sessions(status);
CREATE INDEX idx_payments_session_id ON payments(session_id);
```

**Large Table Scans:** Queries without WHERE clauses scan entire tables. Add appropriate filtering:

```typescript
// Bad - scans entire table
const sessions = await db.select().from(analysisSessions);

// Good - uses index
const sessions = await db
  .select()
  .from(analysisSessions)
  .where(eq(analysisSessions.userId, userId));
```

**N+1 Query Problem:** Loading related data in loops causes excessive queries. Use joins instead:

```typescript
// Bad - N+1 queries
const sessions = await db.select().from(analysisSessions);
for (const session of sessions) {
  const payment = await db
    .select()
    .from(payments)
    .where(eq(payments.sessionId, session.id));
}

// Good - single query with join
const sessionsWithPayments = await db
  .select()
  .from(analysisSessions)
  .leftJoin(payments, eq(analysisSessions.id, payments.sessionId));
```

## Authentication Issues

### JWT Token Errors

**Symptom:** Users are logged out unexpectedly or receive "Invalid token" errors.

**Diagnostic Steps:**

Check JWT secret configuration:

```bash
echo $JWT_SECRET
# Should output a long random string
```

Verify token expiration settings in `server/_core/auth.ts`:

```typescript
const token = jwt.sign(
  { userId: user.id, role: user.role },
  JWT_SECRET,
  { expiresIn: "30d" } // Check this value
);
```

**Common Causes and Solutions:**

**JWT Secret Mismatch:** The JWT_SECRET changed between token issuance and verification. This invalidates all existing tokens. Users must log in again. To prevent this, never change JWT_SECRET in production.

**Token Expiration:** Tokens expire after the configured duration. Implement token refresh logic or increase expiration time:

```typescript
// Increase token lifetime to 90 days
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "90d" });
```

**Clock Skew:** Server time is incorrect, causing tokens to appear expired. Sync server time with NTP:

```bash
sudo ntpdate -s time.nist.gov
```

**Cookie Issues:** Authentication cookies are not being sent. Check cookie configuration:

```typescript
res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Must be true in production
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
```

### MetaMask Authentication Failures

**Symptom:** Admin users cannot log in with MetaMask, signature verification fails.

**Diagnostic Steps:**

Check admin wallet address configuration:

```bash
echo $ADMIN_WALLET_ADDRESS
# Should output: 0x...
```

Verify the challenge message format matches between frontend and backend:

```typescript
// Frontend
const challenge = `Sign this message to authenticate: ${timestamp}`;

// Backend
const expectedMessage = `Sign this message to authenticate: ${timestamp}`;
```

**Common Causes and Solutions:**

**Wallet Address Mismatch:** The connected wallet address doesn't match ADMIN_WALLET_ADDRESS. Verify the correct wallet is connected in MetaMask.

**Signature Format:** Ethereum signatures use specific formats. Ensure consistent signing method:

```typescript
// Frontend - use personal_sign
const signature = await ethereum.request({
  method: "personal_sign",
  params: [challenge, walletAddress]
});

// Backend - verify with ecrecover
const recoveredAddress = ethers.utils.verifyMessage(challenge, signature);
```

**Challenge Expiration:** Challenges expire after 5 minutes. Generate a new challenge if authentication fails:

```typescript
const CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes

if (Date.now() - challengeTimestamp > CHALLENGE_EXPIRY) {
  throw new Error("Challenge expired");
}
```

## Payment Integration Issues

### LemonSqueezy Webhook Failures

**Symptom:** Payments complete but analysis doesn't start, webhook endpoint returns errors.

**Diagnostic Steps:**

Check webhook logs in LemonSqueezy dashboard under Settings → Webhooks. Look for failed deliveries and error messages.

Test webhook signature verification:

```bash
curl -X POST https://yourdomain.com/api/webhooks/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "X-Signature: test-signature" \
  -d '{"test": true}'
```

**Common Causes and Solutions:**

**Invalid Signature:** Webhook secret doesn't match between LemonSqueezy and application. Verify LEMONSQUEEZY_WEBHOOK_SECRET matches the secret shown in LemonSqueezy dashboard.

**Missing Custom Data:** Session ID not included in checkout. Ensure custom data is set when creating checkout:

```typescript
const checkout = await createLemonSqueezyCheckout({
  variantId: LEMONSQUEEZY_VARIANT_SYNDICATE,
  email: "user@example.com",
  customData: {
    session_id: sessionId,
    tier: "full"
  }
});
```

**Webhook URL Unreachable:** LemonSqueezy cannot reach webhook endpoint. Verify:
- URL is publicly accessible (not localhost)
- SSL certificate is valid
- No firewall blocking LemonSqueezy IPs

**Event Handling Logic:** Webhook receives events but doesn't process them correctly. Add logging to debug:

```typescript
export async function handleLemonSqueezyWebhook(req: Request) {
  console.log("Webhook received:", JSON.stringify(req.body, null, 2));
  
  // Verify signature
  // Process event
  // Log success
  console.log("Webhook processed successfully");
}
```

### NOWPayments Status Issues

**Symptom:** Cryptocurrency payments show as "pending" indefinitely, never complete.

**Diagnostic Steps:**

Check payment status directly through NOWPayments API:

```bash
curl -X GET "https://api.nowpayments.io/v1/payment/PAYMENT_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

Verify IPN callback is configured correctly in NOWPayments dashboard.

**Common Causes and Solutions:**

**Insufficient Confirmations:** Cryptocurrency transactions require multiple blockchain confirmations. Bitcoin requires 2 confirmations, Ethereum requires 12. Wait for sufficient confirmations before considering payment complete.

**IPN Not Configured:** NOWPayments doesn't know where to send status updates. Configure IPN URL in dashboard:

```
IPN Callback URL: https://yourdomain.com/api/webhooks/nowpayments
```

**Signature Verification Failure:** IPN signature doesn't match. Verify NOWPAYMENTS_IPN_SECRET is correct:

```typescript
const signature = req.headers["x-nowpayments-sig"];
const body = JSON.stringify(req.body);
const expectedSignature = crypto
  .createHmac("sha512", NOWPAYMENTS_IPN_SECRET)
  .update(body)
  .digest("hex");

console.log("Received signature:", signature);
console.log("Expected signature:", expectedSignature);
```

**Underpayment:** Customer sent insufficient cryptocurrency. NOWPayments marks payment as "partially_paid". Handle this case:

```typescript
if (payment.payment_status === "partially_paid") {
  // Notify customer to send remaining amount
  await sendEmail({
    to: payment.email,
    subject: "Additional payment required",
    body: `Please send ${payment.missing_amount} ${payment.pay_currency} to complete payment`
  });
}
```

## AI Analysis Issues

### Analysis Generation Failures

**Symptom:** Analysis status remains "processing" indefinitely, or fails with error.

**Diagnostic Steps:**

Check Perplexity API status and rate limits:

```bash
curl -X GET "https://api.perplexity.ai/status" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY"
```

Review application logs for error messages during analysis generation.

**Common Causes and Solutions:**

**API Rate Limiting:** Perplexity API has rate limits. Implement exponential backoff:

```typescript
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await invokeLLM({ messages: [{ role: "user", content: prompt }] });
    } catch (error) {
      if (error.status === 429) { // Rate limit
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
```

**Invalid API Key:** Perplexity API key is incorrect or expired. Verify key in Perplexity dashboard and update PERPLEXITY_API_KEY.

**Prompt Too Long:** Combined prompt and conversation history exceeds token limit. Implement context window management:

```typescript
function truncateConversationHistory(history: Message[], maxTokens: number) {
  // Keep system message and most recent messages
  const systemMessage = history[0];
  const recentMessages = history.slice(-10); // Keep last 10 messages
  return [systemMessage, ...recentMessages];
}
```

**Network Timeouts:** API requests timeout before completion. Increase timeout and add retry logic:

```typescript
const response = await fetch("https://api.perplexity.ai/chat/completions", {
  method: "POST",
  headers: { "Authorization": `Bearer ${PERPLEXITY_API_KEY}` },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(120000) // 2 minute timeout
});
```

### Incomplete Analysis Results

**Symptom:** Analysis completes but some parts are missing or truncated.

**Diagnostic Steps:**

Check database for partial results:

```sql
SELECT 
  id,
  status,
  part1 IS NOT NULL as has_part1,
  part2 IS NOT NULL as has_part2,
  part3 IS NOT NULL as has_part3,
  part4 IS NOT NULL as has_part4,
  part5 IS NOT NULL as has_part5,
  part6 IS NOT NULL as has_part6
FROM analysis_sessions
WHERE id = 'session-id';
```

Review logs for errors during specific part generation.

**Common Causes and Solutions:**

**Token Limit Exceeded:** Individual parts exceed their token limits and get truncated. The token limits were recently increased to address this:

| Part | Token Limit |
|------|-------------|
| Part 1-3 | 6,500 |
| Part 4-5 | 7,500 |
| Part 6 | 5,500 |

If truncation still occurs, further increase limits in `server/services/tierPromptService.ts`.

**Database Write Failure:** Part generated successfully but failed to save to database. Check database connection and storage limits:

```sql
SHOW VARIABLES LIKE 'max_allowed_packet';
-- Increase if needed
SET GLOBAL max_allowed_packet=67108864; -- 64MB
```

**Process Interruption:** Analysis process was interrupted mid-generation. Implement recovery logic:

```typescript
async function generateAnalysisWithRecovery(sessionId: string) {
  const session = await getSessionById(sessionId);
  
  // Determine which parts are already complete
  const startPart = session.part1 ? (session.part2 ? (session.part3 ? 4 : 3) : 2) : 1;
  
  // Resume from incomplete part
  for (let partNum = startPart; partNum <= 6; partNum++) {
    await generatePart(sessionId, partNum);
  }
}
```

## Email Delivery Issues

### Emails Not Sending

**Symptom:** Purchase confirmation or analysis completion emails are not delivered.

**Diagnostic Steps:**

Check Resend dashboard for delivery status and bounce reports.

Test email sending directly:

```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@yourdomain.com",
    "to": "test@example.com",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

**Common Causes and Solutions:**

**Domain Not Verified:** Sending domain hasn't been verified in Resend. Complete domain verification:

1. Go to Resend dashboard → Domains
2. Add your domain
3. Configure DNS records (SPF, DKIM, DMARC)
4. Wait for verification (up to 48 hours)

**Invalid From Address:** From address doesn't match verified domain. Ensure RESEND_FROM_EMAIL uses verified domain:

```bash
# Correct
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Incorrect - different domain
RESEND_FROM_EMAIL="noreply@otherdomain.com"
```

**Rate Limiting:** Exceeded Resend API rate limits. Implement queuing:

```typescript
import Queue from "bull";

const emailQueue = new Queue("emails", process.env.REDIS_URL);

emailQueue.process(async (job) => {
  await sendEmail(job.data);
});

// Add emails to queue instead of sending directly
await emailQueue.add({ to, subject, html });
```

**Spam Filtering:** Emails are being marked as spam. Improve deliverability:

- Use authenticated domain with SPF/DKIM
- Include unsubscribe link in all marketing emails
- Avoid spam trigger words ("free", "guarantee", "act now")
- Maintain list hygiene (remove bounces and unsubscribes)

### Email Sequence Not Triggering

**Symptom:** Demo users submit email but don't receive follow-up emails.

**Diagnostic Steps:**

Check email sequence status in database:

```sql
SELECT 
  es.email,
  es.subscribed_at,
  ess.email1_sent,
  ess.email2_sent,
  ess.email3_sent,
  ess.email4_sent
FROM email_subscribers es
LEFT JOIN email_sequence_status ess ON es.id = ess.subscriber_id
WHERE es.email = 'user@example.com';
```

Verify cron job is running:

```bash
# Check cron logs
grep CRON /var/log/syslog

# Manually trigger email sequence
curl https://yourdomain.com/api/cron/process-email-sequence
```

**Common Causes and Solutions:**

**Cron Job Not Configured:** Email sequence processor isn't running. Configure hourly cron job:

```bash
# Add to crontab
0 * * * * curl https://yourdomain.com/api/cron/process-email-sequence
```

**Timing Logic Error:** Email sequence timing calculation is incorrect. Verify logic in `server/services/emailSequenceService.ts`:

```typescript
function daysSince(date: Date): number {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Email 2 should send 2-3 days after subscription
if (!status.email2Sent && daysSince(subscriber.subscribedAt) >= 2) {
  await sendEmail2(subscriber.email);
}
```

**Database Transaction Issues:** Email marked as sent but actually failed. Wrap in transaction:

```typescript
await db.transaction(async (tx) => {
  await sendEmail(subscriber.email);
  await tx
    .update(emailSequenceStatus)
    .set({ email1Sent: true })
    .where(eq(emailSequenceStatus.subscriberId, subscriber.id));
});
```

## Frontend Issues

### tRPC Connection Errors

**Symptom:** Frontend shows "Failed to fetch" or "Network error" when calling API.

**Diagnostic Steps:**

Check browser console for detailed error messages.

Verify API endpoint is accessible:

```bash
curl https://yourdomain.com/api/trpc/health
```

**Common Causes and Solutions:**

**CORS Issues:** Browser blocks requests due to CORS policy. Configure CORS in Express:

```typescript
import cors from "cors";

app.use(cors({
  origin: process.env.VITE_APP_URL,
  credentials: true
}));
```

**Incorrect API URL:** Frontend is pointing to wrong API endpoint. Verify configuration in `client/src/lib/trpc.ts`:

```typescript
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc", // Should be relative path for same-origin
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include" // Include cookies
        });
      }
    })
  ]
});
```

**Cookie Not Sent:** Authentication cookie not included in requests. Ensure credentials are included:

```typescript
fetch(url, {
  credentials: "include" // Critical for cookie-based auth
});
```

### React Rendering Errors

**Symptom:** Application crashes with React error boundaries or hooks errors.

**Diagnostic Steps:**

Check browser console for React error messages and stack traces.

Enable React DevTools for component inspection.

**Common Causes and Solutions:**

**Hooks Called Conditionally:** React hooks must be called in the same order every render. Never call hooks inside conditions:

```typescript
// Bad
if (condition) {
  const data = trpc.session.getById.useQuery({ sessionId });
}

// Good
const { data } = trpc.session.getById.useQuery(
  { sessionId },
  { enabled: condition } // Use enabled option instead
);
```

**State Updates After Unmount:** Component updates state after unmounting. Use cleanup in useEffect:

```typescript
useEffect(() => {
  let mounted = true;
  
  fetchData().then(data => {
    if (mounted) {
      setState(data);
    }
  });
  
  return () => {
    mounted = false; // Cleanup
  };
}, []);
```

**Infinite Render Loop:** Component re-renders infinitely due to unstable dependencies:

```typescript
// Bad - creates new object every render
const { data } = trpc.items.getByIds.useQuery({
  ids: [1, 2, 3] // New array reference every render
});

// Good - memoize input
const ids = useMemo(() => [1, 2, 3], []);
const { data } = trpc.items.getByIds.useQuery({ ids });
```

## Performance Issues

### Slow Page Load Times

**Symptom:** Pages take several seconds to load, poor Lighthouse scores.

**Diagnostic Steps:**

Run Lighthouse audit in Chrome DevTools to identify specific issues.

Check Network tab for slow requests and large assets.

**Common Causes and Solutions:**

**Large JavaScript Bundles:** Bundle size exceeds 500KB. Implement code splitting:

```typescript
// Use dynamic imports for large components
const AdminDashboard = lazy(() => import("./pages/Admin"));

// Wrap in Suspense
<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

**Unoptimized Images:** Images are too large or wrong format. Use modern formats and lazy loading:

```html
<img 
  src="/image.webp" 
  loading="lazy"
  width="800"
  height="600"
  alt="Description"
/>
```

**No Caching:** Static assets aren't cached. Configure cache headers:

```typescript
app.use(express.static("dist", {
  maxAge: "1y", // Cache for 1 year
  immutable: true
}));
```

**Blocking Scripts:** JavaScript blocks page rendering. Use defer or async:

```html
<script src="/app.js" defer></script>
```

### High Server CPU Usage

**Symptom:** Server CPU usage consistently above 80%, slow response times.

**Diagnostic Steps:**

Profile application to identify CPU-intensive operations:

```bash
node --prof server/_core/index.ts
node --prof-process isolate-*.log > processed.txt
```

Check for runaway processes:

```bash
top -o %CPU
```

**Common Causes and Solutions:**

**Synchronous Operations:** Blocking operations prevent other requests from processing. Use async alternatives:

```typescript
// Bad - blocks event loop
const data = fs.readFileSync("file.txt");

// Good - non-blocking
const data = await fs.promises.readFile("file.txt");
```

**Inefficient Algorithms:** O(n²) or worse algorithms process large datasets. Optimize with better data structures:

```typescript
// Bad - O(n²)
for (const item1 of items) {
  for (const item2 of items) {
    if (item1.id === item2.relatedId) {
      // Process
    }
  }
}

// Good - O(n)
const itemMap = new Map(items.map(item => [item.id, item]));
for (const item of items) {
  const related = itemMap.get(item.relatedId);
  if (related) {
    // Process
  }
}
```

**Memory Leaks:** Growing memory usage forces garbage collection. Use heap snapshots to identify leaks:

```bash
node --inspect server/_core/index.ts
# Open chrome://inspect
# Take heap snapshots and compare
```

## Support Escalation

If issues persist after following this guide, escalate to the development team with the following information:

**Required Information:**
- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Error messages and stack traces
- Environment details (OS, Node version, database version)
- Relevant logs (application, database, web server)
- Screenshots or screen recordings if applicable

**Contact Methods:**
- GitHub Issues: https://github.com/anorbert-cmyk/Bug/issues
- Email: support@validatestrategy.com
- Emergency: For production outages affecting customers

---

**Last Updated:** January 6, 2025  
**Version:** 1.0.0
