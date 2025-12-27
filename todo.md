# Rapid Apollo - Strategic UX Analysis Platform

## Core Features
- [x] Database schema for users, analyses, purchases, transactions
- [x] Perplexity API integration with multi-part chain support
- [x] Standard tier analysis (single API call)
- [x] Medium tier analysis (single API call)
- [x] Full/Premium tier analysis (4-part sequential chain with streaming)
- [x] Conversation context maintenance across 4 parts

## Payment Integration
- [x] Stripe payment integration
- [x] Stripe webhook handling
- [x] Coinbase Commerce integration
- [x] Coinbase webhook verification
- [x] Three pricing tiers (Standard, Medium, Full)

## Authentication & Admin
- [x] MetaMask wallet authentication for admin
- [x] Signature verification with replay attack prevention
- [x] Admin dashboard with analytics
- [x] Revenue tracking (ETH + USD)
- [x] Tier distribution charts
- [x] Transaction history view
- [x] Conversion funnel visualization

## User Features
- [x] User dashboard for purchased analyses
- [x] Separate views for each tier package
- [x] Purchase history tracking
- [x] Real-time streaming output for multi-part analysis
- [x] Progress indicators for 4-part analysis

## Session & Notifications
- [x] Session-based analysis request system
- [x] Link problem statements to payments and results
- [x] Owner notifications for new purchases
- [x] High-value transaction alerts

## UI/UX
- [x] Landing page with tier selection
- [x] Problem statement input
- [x] Payment flow UI
- [x] Analysis results display
- [x] Professional clean design (dark theme)
- [x] Use existing GitHub repo design (light/dark theme)
- [x] Use existing UI kit components
- [x] Upgrade to higher tier option in dashboard
- [x] Buy new analysis with different problem statement
- [x] Show current tier badge on analysis

## Security Audit
- [x] Input validation and sanitization
- [x] SQL injection prevention (Drizzle ORM parameterized queries)
- [x] XSS prevention (output encoding)
- [x] CSRF protection (SameSite cookies)
- [x] Rate limiting (implemented middleware)
- [x] Webhook signature verification (Stripe + Coinbase)
- [x] Replay attack prevention for MetaMask (signature tracking)
- [x] Session security (HttpOnly, Secure cookies)
- [x] API key exposure prevention (server-side only)
- [x] Authorization checks on all endpoints

## Testing
- [x] Session router tests
- [x] Security tests (input validation, admin auth)
- [x] Auth logout tests

## Design Finomhangolás (Railway verzió alapján)
- [x] Light/dark skin választó implementálása
- [x] Háttér animációk (gradient blobs)
- [x] Pricing cards stílusának másolása
- [x] FAQ szekció kialakítása
- [x] The Output szekció kialakítása (Perplexity eredmény helye)
- [x] Admin wallet cím beállítása: 0xa14504ffe5E9A245c9d4079547Fa16fA0A823114
- [x] Coinbase fizetési lehetőség UI (Pay with Any Crypto gomb)
- [x] Dashboard sidebar menüpontok (Home, My Analyses, Admin)

## API Integráció (GitHub repóból)
- [x] Perplexity API integráció (Manus LLM helper-en keresztül)
- [x] Stripe API integráció (Payment Intent + Webhook)
- [x] Coinbase Commerce integráció (Charge + Webhook)
- [x] Observer/Insider tier: egyszerű egylépcsős API hívás implementálása
- [x] Syndicate tier: multiline API hívás lánc implementálása (4 részes)
- [x] Promptok átvétele a GitHub repóból
- [x] Prompt injection védelem implementálása

## PayPal Integráció
- [x] PayPal szolgáltatás létrehozása (backend)
- [x] PayPal order létrehozás API
- [x] PayPal capture API
- [x] PayPal webhook verificáció
- [x] PayPal UI gomb a Checkout oldalon
- [x] Sandbox/Live mód támogatás
- [x] Tesztek írása (7 teszt)
