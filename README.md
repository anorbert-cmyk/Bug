# ValidateStrategy - AI-Powered Strategic UX Analysis Platform

**ValidateStrategy** is an enterprise-grade platform that delivers comprehensive UX strategy analysis powered by advanced AI. The platform provides three distinct service tiers—Observer, Insider, and Syndicate—each designed to meet different strategic needs, from rapid validation to deep strategic planning with production-ready design artifacts.

## Overview

ValidateStrategy transforms product ideas and UX challenges into actionable strategic plans through AI-powered analysis. The platform integrates multiple payment providers, real-time analysis tracking, and automated email workflows to deliver a seamless customer experience from purchase to delivery.

### Key Features

**Multi-Tier Analysis System** provides three distinct service levels. The Observer tier delivers focused single-part analysis for rapid validation. The Insider tier offers two-part strategic analysis with competitive insights. The Syndicate tier provides comprehensive six-part analysis including ten production-ready Figma prompts, risk assessment, and ROI calculations.

**Real-Time Analysis Tracking** enables customers to monitor analysis progress through a live dashboard. The system tracks each analysis part's status, displays estimated completion times, and streams results as they become available.

**Flexible Payment Integration** supports multiple payment methods including credit cards via LemonSqueezy, cryptocurrency payments through NOWPayments, and traditional PayPal transactions. All payment flows integrate with automated analysis triggering and email notifications.

**Automated Email Marketing** delivers a four-stage nurture sequence to demo users. The system tracks email opens, manages send timing, and includes priority upgrade offers for engaged prospects.

**Admin Analytics Dashboard** provides comprehensive business intelligence. The dashboard displays revenue metrics, tier distribution, conversion funnels, and transaction history with wallet address tracking for crypto payments.

## Architecture

### Technology Stack

The platform is built on a modern full-stack architecture optimized for real-time performance and scalability.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite | Modern reactive UI with fast hot-reload |
| **Styling** | Tailwind CSS 4 | Utility-first styling with custom design system |
| **Backend** | Express 4 + tRPC 11 | Type-safe API with end-to-end TypeScript |
| **Database** | MySQL/TiDB + Drizzle ORM | Relational data with type-safe queries |
| **AI Engine** | Perplexity API (via Manus LLM) | Multi-turn conversational analysis |
| **Auth** | Manus OAuth + MetaMask | User authentication and admin wallet verification |
| **Payments** | LemonSqueezy + NOWPayments + PayPal | Multi-provider payment processing |
| **Email** | Resend API | Transactional and marketing emails |

### Project Structure

```
rapid-apollo-manus/
├── client/                 # Frontend React application
│   ├── public/            # Static assets (favicon, images)
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Page-level components
│       ├── contexts/      # React contexts
│       ├── hooks/         # Custom React hooks
│       └── lib/           # Utilities and tRPC client
├── server/                # Backend Express + tRPC application
│   ├── _core/            # Core infrastructure (auth, LLM, email)
│   ├── services/         # Business logic services
│   ├── routers.ts        # tRPC procedure definitions
│   └── db.ts             # Database query helpers
├── drizzle/              # Database schema and migrations
│   └── schema.ts         # Table definitions
├── shared/               # Shared types and constants
│   ├── pricing.ts        # Tier configuration
│   └── types.ts          # Shared TypeScript types
└── docs/                 # Documentation
    ├── API.md            # API reference
    ├── DEVELOPER.md      # Developer guide
    ├── DEPLOYMENT.md     # Deployment instructions
    └── TROUBLESHOOTING.md # Common issues and solutions
```

## Getting Started

### Prerequisites

The development environment requires Node.js 22.x or later, pnpm package manager, and access to a MySQL or TiDB database. You will also need API keys for Perplexity, Resend, and your chosen payment providers.

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/anorbert-cmyk/Bug.git
cd Bug
pnpm install
```

### Environment Configuration

Create a `.env` file in the project root with the following configuration:

```bash
# Database
DATABASE_URL="mysql://user:password@host:port/database"

# Authentication
JWT_SECRET="your-jwt-secret"
ADMIN_WALLET_ADDRESS="0xYourAdminWalletAddress"

# Manus OAuth
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
VITE_APP_ID="your-app-id"

# AI & Analytics
PERPLEXITY_API_KEY="your-perplexity-key"
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="your-forge-key"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-forge-key"

# Email
RESEND_API_KEY="your-resend-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Payment Providers
LEMONSQUEEZY_API_KEY="your-lemonsqueezy-key"
LEMONSQUEEZY_STORE_ID="your-store-id"
LEMONSQUEEZY_VARIANT_OBSERVER="variant-id"
LEMONSQUEEZY_VARIANT_INSIDER="variant-id"
LEMONSQUEEZY_VARIANT_SYNDICATE="variant-id"
LEMONSQUEEZY_WEBHOOK_SECRET="your-webhook-secret"

NOWPAYMENTS_API_KEY="your-nowpayments-key"
NOWPAYMENTS_IPN_SECRET="your-ipn-secret"

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY="your-site-key"
RECAPTCHA_SECRET_KEY="your-secret-key"

# Application
VITE_APP_TITLE="ValidateStrategy"
VITE_APP_LOGO="/logo.svg"
VITE_APP_URL="https://yourdomain.com"
```

### Database Setup

Push the database schema to your MySQL/TiDB instance:

```bash
pnpm db:push
```

This command generates the necessary tables from the Drizzle schema definitions in `drizzle/schema.ts`.

### Development Server

Start the development server with hot-reload enabled:

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Running Tests

Execute the test suite to verify all functionality:

```bash
pnpm test
```

The project includes 312 comprehensive tests covering authentication, payment processing, email delivery, API validation, and business logic.

## Tier Structure

ValidateStrategy offers three distinct service tiers, each designed for specific use cases and customer segments.

### Observer Tier - $49

The Observer tier provides rapid validation for side projects and early-stage ideas. This tier delivers a focused single-part analysis in approximately 48 hours, making it ideal for solo founders who need quick strategic direction without extensive research.

**Analysis Structure:** Single API call generating approximately 3,000 tokens of strategic content.

**Key Features:** Problem analysis with JTBD framework, tailored methodology recommendations, assumption ledger with validation plans, and success metrics framework.

**Delivery Method:** Email delivery with magic link access to analysis dashboard.

### Insider Tier - $99

The Insider tier offers comprehensive two-part analysis for serious founders building validated products. This tier includes competitive deep-dive research and strategic roadmap planning, delivered within 24 hours with dashboard access for ongoing reference.

**Analysis Structure:** Two sequential API calls with conversation context maintenance, generating approximately 6,000 tokens total.

**Part 1 - Discovery & Problem Analysis:** Adaptive problem analysis, core problem statement with JTBD lens, tailored methodology selection, and comprehensive assumption ledger.

**Part 2 - Strategic Roadmap:** Phase-by-phase implementation roadmap, error path mapping and recovery flows, team collaboration model, and success metrics with validation plans.

**Key Features:** Real-time progress tracking, competitor analysis with market positioning, strategic roadmap with decision points, and risk mitigation strategies.

### Syndicate Tier - $199

The Syndicate tier delivers enterprise-grade six-part analysis with production-ready design artifacts. This comprehensive package includes ten Figma prompts, ROI calculator, risk assessment matrix, and priority support with 12-hour turnaround.

**Analysis Structure:** Six sequential API calls with full conversation context, generating approximately 40,000 tokens total.

**Part 1 - Discovery & Problem Analysis (6,500 tokens):** Executive summary, adaptive problem analysis, core problem statement, tailored methodology selection, and assumption ledger.

**Part 2 - Competitor Deep-Dive (6,500 tokens):** Real-time competitive research using Perplexity's web search capabilities, market positioning analysis, feature comparison matrices, and strategic differentiation opportunities.

**Part 3 - Strategic Roadmap (6,500 tokens):** Phase-by-phase implementation timeline, critical workstream identification, team collaboration touchpoints, and decision point mapping.

**Part 4 - 5 Core Design Prompts (7,500 tokens):** Production-ready Figma prompts for homepage hero, onboarding flow, dashboard overview, error states, and pricing page. Each prompt includes real microcopy, layout specifications, accessibility requirements, and rationale.

**Part 5 - 5 Advanced Design Prompts (7,500 tokens):** Additional Figma prompts for case studies, mobile navigation, accessibility-first forms, loading states, and success confirmations. Includes edge case handling and error recovery patterns.

**Part 6 - Risk, Metrics & Strategic Rationale (5,500 tokens):** Comprehensive risk mitigation plan, success metrics with validation plans, business OKR alignment, and final executive summary synthesizing all insights.

**Key Features:** Ten production-ready Figma prompts with copy-paste functionality, AI-enhanced execution toolkit recommendations, comprehensive risk assessment matrix, ROI calculator with business OKR alignment, and team sharing capabilities.

## Payment Flow

The platform supports three payment providers, each integrated with automated analysis triggering and email notifications.

### LemonSqueezy (Credit Cards)

LemonSqueezy handles credit card payments with automatic tax calculation and global payment support. When a customer selects a tier and clicks "Pay with Card," the system creates a checkout session with the customer's email and selected tier variant ID. After successful payment, LemonSqueezy sends a webhook to `/api/webhooks/lemonsqueezy` which verifies the signature, creates an analysis session, and triggers the AI analysis process.

### NOWPayments (Cryptocurrency)

NOWPayments enables cryptocurrency payments supporting Bitcoin, Ethereum, and 150+ other cryptocurrencies. The checkout flow creates a payment with the tier price in USD, and NOWPayments handles conversion to the customer's chosen cryptocurrency. The IPN webhook at `/api/webhooks/nowpayments` verifies the payment signature and triggers analysis upon confirmation.

### PayPal (Traditional Payments)

PayPal integration provides a familiar payment option for customers preferring traditional payment methods. The system creates a PayPal order, captures payment upon approval, and processes webhooks at `/api/webhooks/paypal` to trigger analysis.

## Analysis Generation

The AI analysis engine uses Perplexity API through the Manus LLM helper to generate strategic insights. The system maintains conversation context across multiple API calls, enabling coherent multi-part analysis with cross-referencing between sections.

### Single-Part Analysis (Observer)

Observer tier analysis executes a single API call with a focused prompt designed for rapid validation. The system sanitizes user input to prevent prompt injection, generates approximately 3,000 tokens of strategic content, and stores the result in the database with a "completed" status.

### Two-Part Analysis (Insider)

Insider tier analysis executes two sequential API calls with conversation context maintenance. The first call generates discovery and problem analysis, which is stored as Part 1. The system then sends a continuation prompt referencing Part 1 insights, generating the strategic roadmap as Part 2. Both parts are stored separately and combined into a full markdown document.

### Six-Part Analysis (Syndicate)

Syndicate tier analysis executes six sequential API calls, each building on previous insights. The system maintains full conversation history across all calls, enabling sophisticated cross-referencing and coherent narrative flow. Each part is generated with specific token limits (6,500 for parts 1-3, 7,500 for parts 4-5, and 5,500 for part 6) to ensure comprehensive coverage without truncation.

The analysis engine tracks progress in real-time, updating the database after each part completion. Customers can view live progress through the dashboard, with estimated completion times and part-by-part status indicators.

## Email System

The platform implements two distinct email systems: transactional emails for purchase confirmations and analysis delivery, and automated marketing sequences for demo users.

### Transactional Emails

Purchase confirmation emails are sent immediately after successful payment, providing a magic link to access the analysis dashboard. The email includes tier-specific value propositions, estimated delivery time, and trust indicators. Analysis completion emails notify customers when their analysis is ready, with direct links to view results.

### Marketing Automation

Demo users who submit their email on the demo analysis page enter a four-stage nurture sequence designed to convert them into paying customers.

**Email 1 - Welcome + APEX Cheat Sheet (Immediate):** Delivers immediate value with a strategic UX cheat sheet, introduces the APEX framework, and sets expectations for future emails.

**Email 2 - Social Proof + Founder Story (Day 2-3):** Builds credibility through customer testimonials, shares the founder's journey, and addresses common objections.

**Email 3 - Problem-Solution Deep Dive (Day 5-7):** Demonstrates deep understanding of customer pain points, provides tactical advice, and positions ValidateStrategy as the solution.

**Email 4 - Priority Bonus Offer (Day 10-14):** Creates urgency with a limited-time priority processing offer, includes social proof of recent purchases, and provides clear call-to-action.

The system tracks email opens using unique tracking pixels, enabling analysis of engagement patterns and optimization of send timing.

## Security

ValidateStrategy implements comprehensive security measures to protect customer data and prevent common vulnerabilities.

**Input Validation:** All user inputs are sanitized to prevent SQL injection and XSS attacks. The system uses Drizzle ORM's parameterized queries and validates input patterns before processing.

**Authentication Security:** JWT tokens are signed with secure secrets and stored in HttpOnly, Secure cookies with SameSite protection. Admin authentication requires MetaMask wallet signature verification with replay attack prevention.

**Payment Security:** All payment webhooks verify cryptographic signatures before processing. The system validates webhook sources and prevents replay attacks through idempotency checks.

**API Security:** Rate limiting prevents abuse, and all sensitive endpoints require authentication. API keys are stored server-side only and never exposed to the client.

**Prompt Injection Defense:** The AI analysis engine implements pattern-based detection for common prompt injection attempts, including instruction override, role manipulation, and context escape patterns.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on the development process, coding standards, and pull request procedures.

## License

This project is proprietary software. All rights reserved.

## Support

For technical support, deployment assistance, or business inquiries, please contact the development team through the GitHub repository issues or email support@validatestrategy.com.

---

**Built with** ❤️ **by the ValidateStrategy team**
