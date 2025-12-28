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

## Email Template
- [x] Email template átvétele a GitHub repóból (Hungarian + English)
- [x] Stripe fizetés utáni email küldés implementálása
- [x] Resend API integráció
- [x] Email tesztek (9 teszt)

## FAQ és Success oldal javítások
- [x] FAQ design átvétele a Railway verzió alapján (glass-panel, details/summary)
- [x] Success oldal implementálása (sikeres fizetés után)
- [x] Elemzés készülésének real-time megjelenítése
- [x] Progress indicator a 4 részes elemzéshez (Syndicate tier)
- [x] Confetti animáció sikeres fizetésnél
- [x] Email értesítés jelzése
- [x] Direct ETH payment gombok eltávolítva (csak Stripe, PayPal, Coinbase)

## Hibajavítások
- [x] MetaMask aláírás verifikáció javítása az admin oldalon (challenge-alapú hitelesítés)

- [x] Pay with ETH Direct gomb eltávolítása a pricing kártyákról
- [x] PayPal gomb hozzáadása minden pricing kártyához

- [x] Admin token lejárati idő meghosszabbítása (5 perc -> 30 perc)
- [x] Frontend automatikus újra-hitelesítés kezelése token lejáratkor

## Dashboard Dizájn Frissítés
- [x] Elemzések dashboard dizájn frissítése a GitHub repó stílusa alapján

## Főoldal Kiegészítések
- [x] Folyamat bemutató szekció (Payment → Analysis → Delivery)
- [x] "Trusted By" szekció ismert cégek logóival

## Testimonials Szekció
- [x] Egyedi, nem sablonos Testimonials szekció - kreatív dizájn

## FAQ Szekció Újratervezés
- [x] FAQ szekció átalakítása - piros helyett esztétikus dizájn

## Perplexity API Integráció (APEX Tier)
- [x] Perplexity API helper létrehozása (server/_core/perplexity.ts)
- [x] Masterprompt tárolása és 4-részes elemzés logika
- [x] Backend router az APEX elemzéshez (4 multi-turn API hívás)
- [x] Frontend UI az APEX elemzés megjelenítéséhez (4 rész progresszív betöltése)
- [x] Tesztek írása a Perplexity integrációhoz

## Real-time APEX Progress Indicator
- [x] Backend: Add progress field to analysis results table
- [x] Backend: Update progress after each part completion
- [x] Frontend: Create real-time progress UI with part status
- [x] Frontend: Add polling/refetch for live updates
- [x] Add estimated time remaining display

## Wallet Login & Admin Dashboard
- [x] Fix wallet login 404 error (/api/oauth/login route)
- [x] Create admin dashboard page with analytics
- [x] Track wallet addresses for purchases
- [x] Display purchase history with wallet info
- [x] Add revenue analytics and charts

## Stripe & Payment Fixes
- [x] Fix Stripe buttons not clickable (API keys configured)
- [x] Remove "Only 3 spots left" from Insider tier
- [x] Remove Insider discount (show regular price)
- [x] Remove PayPal payment buttons
- [x] Verify Stripe payment validation (webhook)
- [x] Verify Coinbase/crypto payment validation (webhook)

## Post-Payment Email Flow
- [x] Review current webhook → email flow
- [x] Create custom email template with magic link (Hungarian template exists)
- [x] Magic link works - analysis page is public (no auth required)
- [ ] Test full flow: Stripe payment → Email → Magic link → Analysis status

## Output Page Redesign (APEX 4-Part Display)
- [x] Analyze 4-part output structure from documents
- [x] Design Part 1: Discovery & Problem Analysis section
- [x] Design Part 2: Strategic Design & Roadmap section
- [x] Design Part 3: AI Toolkit & Figma Prompts with copy functionality
- [x] Design Part 4: Risk, Metrics & Rationale section
- [x] Implement collapsible/expandable sections for long content
- [x] Add copy-to-clipboard for Figma prompts
- [x] Create unified Output page with excellent UX/UI
