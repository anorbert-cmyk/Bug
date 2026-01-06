# Deployment Guide

This guide provides comprehensive instructions for deploying ValidateStrategy to production environments, including infrastructure setup, environment configuration, database management, and monitoring.

## Deployment Overview

ValidateStrategy is designed to run on modern cloud platforms with support for Node.js applications and MySQL databases. The application can be deployed to various hosting providers including Vercel, Railway, Render, or self-hosted infrastructure.

### System Requirements

The production environment must meet the following minimum requirements to ensure reliable operation:

**Compute Resources:** The application requires at least 2 CPU cores and 4GB RAM for the Node.js server. During peak analysis generation periods, CPU usage can spike to 80-90% as the AI engine processes multiple concurrent requests.

**Database:** MySQL 8.0 or later, or TiDB Cloud for distributed database capabilities. The database should have at least 20GB storage with automatic backups enabled. Connection pooling is recommended with a minimum pool size of 10 connections.

**Node.js Runtime:** Node.js 22.x or later is required for optimal performance and security. The application uses ES modules and modern JavaScript features that require recent Node.js versions.

**SSL/TLS:** HTTPS is mandatory for production deployments to protect customer payment information and authentication tokens. The hosting platform should provide automatic SSL certificate management.

## Environment Configuration

The application requires numerous environment variables for external service integration. All sensitive credentials must be stored securely and never committed to version control.

### Required Environment Variables

Create a `.env` file or configure environment variables through your hosting platform's dashboard:

```bash
# Database Configuration
DATABASE_URL="mysql://user:password@host:port/database?ssl=true"

# Authentication
JWT_SECRET="generate-secure-random-string-min-32-chars"
ADMIN_WALLET_ADDRESS="0xYourEthereumWalletAddress"

# Manus OAuth
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID="your-manus-app-id"

# AI Services
PERPLEXITY_API_KEY="pplx-your-api-key"
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="your-forge-api-key"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-forge-key"

# Email Service
RESEND_API_KEY="re_your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# LemonSqueezy Payment Provider
LEMONSQUEEZY_API_KEY="your-lemonsqueezy-api-key"
LEMONSQUEEZY_STORE_ID="your-store-id"
LEMONSQUEEZY_VARIANT_OBSERVER="variant-id-for-observer-tier"
LEMONSQUEEZY_VARIANT_INSIDER="variant-id-for-insider-tier"
LEMONSQUEEZY_VARIANT_SYNDICATE="variant-id-for-syndicate-tier"
LEMONSQUEEZY_WEBHOOK_SECRET="your-webhook-signing-secret"

# NOWPayments Cryptocurrency Provider
NOWPAYMENTS_API_KEY="your-nowpayments-api-key"
NOWPAYMENTS_IPN_SECRET="your-ipn-secret"

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY="your-recaptcha-site-key"
RECAPTCHA_SECRET_KEY="your-recaptcha-secret-key"

# Application Configuration
VITE_APP_TITLE="ValidateStrategy"
VITE_APP_LOGO="/logo.svg"
VITE_APP_URL="https://yourdomain.com"
NODE_ENV="production"
PORT="3000"
```

### Generating Secure Secrets

Generate cryptographically secure random strings for sensitive configuration:

```bash
# Generate JWT secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate webhook secrets (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Database Setup

The database must be properly configured and migrated before deploying the application.

### Creating the Database

Create a new MySQL database with UTF-8 character encoding:

```sql
CREATE DATABASE validatestrategy
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Running Migrations

Apply all database migrations to create the required tables:

```bash
# Generate migration files from schema
pnpm db:generate

# Apply migrations to database
pnpm db:push
```

The migration process creates the following tables:

- `users` - User accounts and authentication
- `analysis_sessions` - Analysis requests and results
- `payments` - Payment transactions
- `email_subscribers` - Demo user email addresses
- `email_sequence_status` - Email automation tracking
- `email_opens` - Email engagement tracking

### Database Backup Strategy

Implement automated daily backups with point-in-time recovery capability. Most cloud database providers offer automatic backup configuration through their dashboard. For self-hosted databases, configure automated backups using cron jobs:

```bash
# Daily backup at 2 AM
0 2 * * * mysqldump -u user -p password validatestrategy | gzip > /backups/validatestrategy-$(date +\%Y\%m\%d).sql.gz
```

Retain backups for at least 30 days and test restore procedures monthly to ensure backup integrity.

## Payment Provider Configuration

Each payment provider requires specific configuration steps to enable production payments.

### LemonSqueezy Setup

1. **Create Account:** Sign up at https://lemonsqueezy.com and complete business verification
2. **Create Store:** Set up a new store with your business information
3. **Create Products:** Create three products for Observer, Insider, and Syndicate tiers
4. **Get Variant IDs:** Copy the variant ID for each product tier
5. **Generate API Key:** Create an API key in Settings → API with full access
6. **Configure Webhook:** Add webhook URL `https://yourdomain.com/api/webhooks/lemonsqueezy` with events: `order_created`, `subscription_created`, `subscription_updated`
7. **Copy Webhook Secret:** Save the webhook signing secret to environment variables

### NOWPayments Setup

1. **Create Account:** Sign up at https://nowpayments.io and complete KYC verification
2. **Generate API Key:** Create an API key in Settings → API Keys
3. **Configure IPN:** Set IPN callback URL to `https://yourdomain.com/api/webhooks/nowpayments`
4. **Generate IPN Secret:** Create an IPN secret key for signature verification
5. **Select Currencies:** Enable Bitcoin, Ethereum, and other desired cryptocurrencies
6. **Test Sandbox:** Verify integration using sandbox mode before enabling production

### PayPal Setup

1. **Create Business Account:** Sign up at https://paypal.com/business
2. **Create App:** Go to Developer Dashboard → My Apps & Credentials → Create App
3. **Get Credentials:** Copy Client ID and Secret for production environment
4. **Configure Webhooks:** Add webhook URL `https://yourdomain.com/api/webhooks/paypal` with events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`
5. **Verify Webhook:** Use PayPal's webhook simulator to test integration

## Email Service Configuration

The application uses Resend for transactional and marketing emails. Proper domain configuration is essential for email deliverability.

### Resend Setup

1. **Create Account:** Sign up at https://resend.com
2. **Verify Domain:** Add your domain and configure DNS records:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: Add provided DKIM record
   - DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
3. **Generate API Key:** Create an API key with sending permissions
4. **Configure From Address:** Set `RESEND_FROM_EMAIL` to an address on your verified domain
5. **Test Delivery:** Send test emails to verify configuration

### Email Deliverability Best Practices

Maintain high email deliverability by following these practices:

**Warm Up Domain:** Gradually increase email volume over 2-4 weeks when starting with a new domain. Begin with 50 emails per day and double every 3 days until reaching target volume.

**Monitor Bounce Rates:** Keep bounce rates below 2% by removing invalid email addresses. Implement email validation on signup forms to prevent typos.

**Handle Unsubscribes:** Provide clear unsubscribe links in all marketing emails and honor unsubscribe requests immediately.

**Monitor Spam Complaints:** Keep spam complaint rates below 0.1% by sending only to engaged subscribers and providing value in every email.

## Deployment Platforms

The application can be deployed to various hosting platforms with different tradeoffs in complexity, cost, and scalability.

### Vercel Deployment

Vercel provides the simplest deployment experience with automatic SSL, global CDN, and serverless functions.

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Configure Project**

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/_core/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/_core/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "client/dist/$1"
    }
  ]
}
```

**Step 3: Deploy**
```bash
vercel --prod
```

**Step 4: Configure Environment Variables**

Add all required environment variables through Vercel dashboard under Settings → Environment Variables.

### Railway Deployment

Railway provides a more traditional hosting experience with persistent storage and long-running processes.

**Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

**Step 2: Initialize Project**
```bash
railway init
```

**Step 3: Configure Build**

Create `railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "pnpm install && pnpm build"

[deploy]
startCommand = "pnpm start"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3
```

**Step 4: Deploy**
```bash
railway up
```

**Step 5: Configure Environment Variables**

Add environment variables through Railway dashboard under Variables tab.

### Self-Hosted Deployment

For maximum control, deploy to your own infrastructure using Docker or traditional server setup.

**Docker Deployment:**

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      # Add all other environment variables
    restart: unless-stopped
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=validatestrategy
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

**Deploy with Docker Compose:**
```bash
docker-compose up -d
```

## Post-Deployment Configuration

After deploying the application, complete these configuration steps to ensure full functionality.

### Webhook URL Configuration

Update webhook URLs in each payment provider's dashboard to point to your production domain:

- LemonSqueezy: `https://yourdomain.com/api/webhooks/lemonsqueezy`
- NOWPayments: `https://yourdomain.com/api/webhooks/nowpayments`
- PayPal: `https://yourdomain.com/api/webhooks/paypal`

### Email Cron Job

The email automation system requires a cron job to process the email sequence. Configure a scheduled task to run hourly:

**Using cron (Linux/Unix):**
```bash
0 * * * * curl https://yourdomain.com/api/cron/process-email-sequence
```

**Using Vercel Cron:**

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-email-sequence",
    "schedule": "0 * * * *"
  }]
}
```

**Using Railway Cron:**

Create a separate service with cron schedule in `railway.toml`:
```toml
[deploy]
cronSchedule = "0 * * * *"
```

### SSL Certificate

Ensure HTTPS is enabled with a valid SSL certificate. Most hosting platforms provide automatic SSL through Let's Encrypt. For self-hosted deployments, use Certbot:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### DNS Configuration

Configure DNS records to point to your hosting platform:

```
A     @     your-server-ip
CNAME www   your-hosting-platform.com
```

## Monitoring and Logging

Implement comprehensive monitoring to detect issues before they impact customers.

### Application Monitoring

Use application performance monitoring (APM) tools to track response times, error rates, and resource usage. Recommended tools include:

**Sentry** for error tracking and performance monitoring. Install the Sentry SDK:

```bash
pnpm add @sentry/node @sentry/tracing
```

Configure in `server/_core/index.ts`:

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Datadog** for comprehensive infrastructure and application monitoring. Configure the Datadog agent on your server and enable APM tracing.

### Database Monitoring

Monitor database performance metrics including:

- Query execution time
- Connection pool utilization
- Slow query log
- Disk usage and growth rate
- Replication lag (if using replicas)

Set up alerts for:
- Query execution time > 1 second
- Connection pool utilization > 80%
- Disk usage > 80%
- Replication lag > 10 seconds

### Logging Strategy

Implement structured logging with appropriate log levels:

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

Use appropriate log levels:
- **ERROR:** Application errors requiring immediate attention
- **WARN:** Potential issues that don't prevent operation
- **INFO:** Important business events (payments, analysis completion)
- **DEBUG:** Detailed diagnostic information

### Alerting Configuration

Set up alerts for critical issues:

**Error Rate Alert:** Trigger when error rate exceeds 1% of requests
```
if (error_rate > 0.01) {
  send_alert("High error rate detected");
}
```

**Response Time Alert:** Trigger when P95 response time exceeds 2 seconds
```
if (p95_response_time > 2000) {
  send_alert("Slow response times detected");
}
```

**Payment Failure Alert:** Trigger when payment webhook processing fails
```
if (payment_webhook_failed) {
  send_alert("Payment webhook processing failed");
}
```

**Database Connection Alert:** Trigger when database connections are exhausted
```
if (db_connections_available < 2) {
  send_alert("Database connection pool nearly exhausted");
}
```

## Scaling Considerations

As the platform grows, implement these scaling strategies to maintain performance.

### Horizontal Scaling

Deploy multiple application instances behind a load balancer to distribute traffic. Ensure session state is stored in the database rather than in-memory to support multiple instances.

**Load Balancer Configuration (Nginx):**

```nginx
upstream app_servers {
  server app1.internal:3000;
  server app2.internal:3000;
  server app3.internal:3000;
}

server {
  listen 80;
  server_name yourdomain.com;

  location / {
    proxy_pass http://app_servers;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### Database Scaling

Implement read replicas for database queries that don't require real-time consistency. Route analysis result queries to read replicas while keeping write operations on the primary database.

```typescript
// Write to primary
await primaryDb.insert(analysisSessions).values(sessionData);

// Read from replica
const sessions = await replicaDb
  .select()
  .from(analysisSessions)
  .where(eq(analysisSessions.userId, userId));
```

### Caching Strategy

Implement Redis caching for frequently accessed data:

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

// Cache analysis results
async function getCachedAnalysis(sessionId: string) {
  const cached = await redis.get(`analysis:${sessionId}`);
  if (cached) return JSON.parse(cached);
  
  const analysis = await db.query.analysisSessions.findFirst({
    where: eq(analysisSessions.id, sessionId)
  });
  
  await redis.setex(`analysis:${sessionId}`, 3600, JSON.stringify(analysis));
  return analysis;
}
```

### CDN Configuration

Serve static assets through a CDN to reduce server load and improve global performance. Configure your CDN to cache:

- JavaScript bundles (1 year)
- CSS files (1 year)
- Images (1 year)
- Fonts (1 year)

Use cache-busting through filename hashing to enable long cache times while supporting instant updates.

## Security Hardening

Implement these security measures to protect the production environment.

### SSL/TLS Configuration

Use TLS 1.3 with strong cipher suites. Disable older protocols:

```nginx
ssl_protocols TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
```

### Security Headers

Configure security headers to protect against common attacks:

```typescript
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  next();
});
```

### Rate Limiting

Implement aggressive rate limiting to prevent abuse:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

app.use("/api/", limiter);
```

### Secrets Management

Use a secrets management service for sensitive credentials:

**AWS Secrets Manager:**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });
const response = await client.send(
  new GetSecretValueCommand({ SecretId: "prod/validatestrategy/db" })
);
const secrets = JSON.parse(response.SecretString);
```

**HashiCorp Vault:**
```typescript
import vault from "node-vault";

const client = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

const secrets = await client.read("secret/data/validatestrategy");
```

## Disaster Recovery

Implement comprehensive disaster recovery procedures to minimize downtime and data loss.

### Backup Strategy

Maintain multiple backup types:

**Database Backups:** Daily full backups with point-in-time recovery capability. Retain backups for 30 days with weekly backups retained for 1 year.

**Application Backups:** Version control through Git provides application code backups. Tag each production deployment for easy rollback.

**Configuration Backups:** Store environment variables and configuration in encrypted form in version control or secrets management system.

### Recovery Procedures

Document step-by-step recovery procedures for common failure scenarios:

**Database Failure:**
1. Provision new database instance
2. Restore from most recent backup
3. Apply transaction logs for point-in-time recovery
4. Update application DATABASE_URL
5. Restart application
6. Verify functionality

**Application Failure:**
1. Check application logs for error cause
2. If code issue, rollback to previous deployment
3. If infrastructure issue, provision new instance
4. Deploy application to new instance
5. Update DNS or load balancer
6. Verify functionality

**Complete Infrastructure Failure:**
1. Provision new infrastructure in different region
2. Restore database from backup
3. Deploy application from Git repository
4. Configure environment variables
5. Update DNS to point to new infrastructure
6. Verify functionality

### Testing Recovery

Test disaster recovery procedures quarterly to ensure they work correctly and team members are familiar with the process. Document actual recovery time and compare against recovery time objectives (RTO).

## Maintenance Windows

Schedule regular maintenance windows for updates and infrastructure changes.

### Update Strategy

Apply security updates within 48 hours of release. Apply feature updates during scheduled maintenance windows with advance notice to customers.

**Maintenance Window Schedule:**
- Security patches: As needed, typically < 5 minutes downtime
- Minor updates: Monthly, Sunday 2-4 AM UTC
- Major updates: Quarterly, with 2 weeks advance notice

**Update Procedure:**
1. Announce maintenance window to customers
2. Create database backup
3. Deploy updates to staging environment
4. Run full test suite
5. Deploy to production
6. Monitor for issues
7. Rollback if problems detected

### Zero-Downtime Deployments

Implement blue-green deployments for zero-downtime updates:

1. Deploy new version to inactive environment (green)
2. Run smoke tests on green environment
3. Switch load balancer to green environment
4. Monitor for issues
5. Keep blue environment running for quick rollback
6. After stability confirmed, decommission blue environment

---

**Last Updated:** January 6, 2025  
**Version:** 1.0.0
