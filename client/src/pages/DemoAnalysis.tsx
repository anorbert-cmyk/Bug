import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Target, 
  Lightbulb, 
  AlertTriangle, 
  Mail, 
  Lock, 
  Sparkles, 
  Zap, 
  Clock,
  Layers,
  Copy,
  Check,
  Palette,
  Shield,
  TrendingUp,
  ArrowRight,
  Home,
  History,
  Plus,
  Eye
} from "lucide-react";
import { useLocation } from "wouter";

// Demo analysis data - Full rich content for each part
const DEMO_ANALYSIS = {
  problemStatement: "I want to build a SaaS platform that provides AI-powered strategic UX analysis for startups and product teams, helping them validate ideas and create actionable roadmaps.",
  overview: `## Executive Summary

This comprehensive APEX analysis examines the feasibility and strategic approach for building an AI-powered UX analysis platform. The analysis reveals a significant market opportunity in the intersection of AI capabilities and UX consulting, with an estimated addressable market of $2.3B by 2026.

**Key Findings:**
- Strong product-market fit potential with early-stage startups and product teams
- Technical feasibility confirmed with current AI capabilities (GPT-4, Claude, Perplexity)
- Recommended MVP timeline: 8-12 weeks with core features
- Primary risk: Market education and trust-building with AI-generated insights

**Strategic Recommendation:** Proceed with development using a phased approach, starting with a focused MVP targeting seed-stage startups. The combination of AI-powered analysis with human-curated frameworks provides a defensible competitive advantage.

The platform should prioritize:
1. Rapid time-to-value (24-hour analysis delivery)
2. Actionable, implementation-ready outputs
3. Integration with existing product workflows (Figma, Notion, Linear)

**Projected ROI:** 3.2x within 18 months based on conservative customer acquisition estimates.`,
  part1: {
    title: "Discovery & Problem Analysis",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    content: `# Part 1: Discovery & Problem Analysis

## Problem Context

The challenge of building a SaaS platform for strategic UX analysis represents a complex intersection of AI capabilities, user experience design, and business model validation. This analysis examines the core problem space and identifies key opportunities.

### Market Landscape

The UX consulting market is valued at approximately $1.8 billion globally, with a projected CAGR of 12.3% through 2028. However, traditional UX consulting faces several challenges:

- **High Cost Barrier**: Enterprise UX audits typically range from $15,000 to $50,000
- **Long Delivery Times**: Traditional analysis takes 4-8 weeks
- **Scalability Issues**: Human-dependent processes limit growth
- **Inconsistent Quality**: Results vary significantly by consultant

### Target User Personas

**Primary Persona: Startup Founder (Sarah)**
- Age: 28-40
- Stage: Seed to Series A
- Pain Points: Limited budget, needs fast validation, lacks UX expertise
- Goals: Validate product direction, impress investors, ship faster

**Secondary Persona: Product Manager (Marcus)**
- Age: 30-45
- Company: Mid-size tech company
- Pain Points: Stakeholder alignment, data-driven decisions, resource constraints
- Goals: Prioritize roadmap, reduce redesign cycles, improve metrics

### Competitive Analysis

| Competitor | Strengths | Weaknesses | Price Point |
|------------|-----------|------------|-------------|
| UserTesting | Large panel, video feedback | Expensive, slow | $15k+/year |
| Maze | Quick surveys, integrations | Limited depth | $99-499/mo |
| Hotjar | Heatmaps, recordings | No strategic insights | $39-389/mo |
| **Our Platform** | AI-powered, fast, strategic | New entrant | $29-199/analysis |

### Key Insights

1. **Gap in Market**: No solution offers fast, affordable, strategic UX analysis
2. **AI Timing**: LLM capabilities now sufficient for nuanced analysis
3. **Willingness to Pay**: Surveys indicate 73% of founders would pay $100-300 for instant analysis
4. **Distribution Opportunity**: Product Hunt, Twitter/X, and indie hacker communities are underserved`
  },
  part2: {
    title: "Strategic Design & Roadmap",
    icon: Layers,
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    gradient: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30",
    content: `# Part 2: Strategic Design & Roadmap

## Phase-by-Phase Implementation

### Phase 1: Foundation (Weeks 1-4)

**Technical Infrastructure**
- Set up Next.js/React frontend with TypeScript
- Implement tRPC for type-safe API layer
- Configure PostgreSQL database with Drizzle ORM
- Integrate Stripe for payment processing
- Set up authentication (OAuth + wallet connect)

**Core Features**
- Problem statement input interface
- Basic AI analysis pipeline (single-tier)
- Email delivery system
- Simple dashboard for results

**Success Metrics**
- 10 beta users onboarded
- <5 minute analysis generation time
- 90% email delivery rate

### Phase 2: Enhancement (Weeks 5-8)

**Advanced Analysis**
- Multi-part APEX analysis (4-part chain)
- Perplexity integration for real-time research
- Figma prompt generation
- PDF export functionality

**User Experience**
- Progress indicators during analysis
- Collapsible section navigation
- Copy-to-clipboard for prompts
- Mobile-responsive design

**Monetization**
- Three-tier pricing (Observer, Insider, Syndicate)
- Crypto payment option (NOWPayments)
- Referral program foundation

### Phase 3: Scale (Weeks 9-12)

**Growth Features**
- Email nurturing sequences
- Demo analysis with email gate
- Admin dashboard with analytics
- A/B testing framework

**Technical Optimization**
- CDN for global performance
- Database query optimization
- Caching layer implementation
- Error monitoring (Sentry)

## Resource Allocation

| Role | Hours/Week | Duration | Cost Estimate |
|------|------------|----------|---------------|
| Full-stack Developer | 40 | 12 weeks | $24,000 |
| AI/ML Engineer | 20 | 8 weeks | $12,000 |
| Designer | 15 | 6 weeks | $6,000 |
| QA/Testing | 10 | 4 weeks | $2,000 |
| **Total** | | | **$44,000** |

## Technology Stack Recommendation

\`\`\`
Frontend: React 19 + TypeScript + Tailwind CSS 4
Backend: Node.js + tRPC + Express
Database: PostgreSQL + Drizzle ORM
AI: OpenAI GPT-4 + Perplexity sonar-pro
Payments: Stripe + NOWPayments
Hosting: Vercel/Railway + Cloudflare
\`\`\``
  },
  part3: {
    title: "AI Toolkit & Figma Prompts",
    icon: Lightbulb,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
    gradient: "from-yellow-500/20 to-orange-500/20",
    borderColor: "border-yellow-500/30",
    content: `# Part 3: AI Toolkit & Figma Prompts

## AI-Enhanced Execution Toolkit

### Recommended AI Tools

1. **Content Generation**: GPT-4 for analysis, Claude for long-form
2. **Research**: Perplexity sonar-pro for real-time web data
3. **Design**: Figma AI, Midjourney for assets
4. **Code**: GitHub Copilot, Cursor for development
5. **Testing**: Playwright for E2E, Vitest for unit tests
6. **Analytics**: PostHog for product analytics

### Automation Workflows

**Analysis Pipeline**
\`\`\`
Input → Validation → AI Processing → Quality Check → Delivery
  ↓         ↓            ↓              ↓           ↓
 Form    Sanitize    4-Part Chain    Review     Email+Dashboard
\`\`\`

## 10 Production-Ready Figma Prompts

### Prompt 1: Homepage Hero (Landing Page)
\`\`\`
Design a dark-themed SaaS landing page hero section with:
- Gradient background (indigo to purple, subtle)
- Large headline: "Stop building in the dark. Validate your idea today."
- Subheadline explaining 24-hour AI analysis
- Primary CTA button with glow effect
- Trust badges below (SSL, 500+ users)
- Floating UI elements showing analysis preview
- Mobile-responsive layout
Style: Modern, tech-forward, premium feel
\`\`\`

### Prompt 2: Pricing Cards (Conversion)
\`\`\`
Create a 3-tier pricing section with:
- Observer ($29): Basic tier, muted styling
- Insider ($79): Popular tier, highlighted border
- Syndicate ($199): Premium tier, gradient background, "APEX" badge
- Each card: price, feature list, CTA button
- Toggle for monthly/annual (future)
- "Powered by Perplexity" badge on premium
Dark theme, glass-morphism cards, subtle animations
\`\`\`

### Prompt 3: Analysis Dashboard (User Portal)
\`\`\`
Design a dashboard showing analysis results:
- Sidebar: Logo, Output, History, Settings
- Main area: 4-part tabbed interface
- Progress indicator for processing state
- Collapsible sections within each part
- Copy buttons for Figma prompts
- Export PDF button in header
- Real-time status updates
Dark theme, terminal/hacker aesthetic accents
\`\`\`

### Prompt 4: Email Gate Modal (Lead Capture)
\`\`\`
Create an email capture overlay:
- Semi-transparent backdrop
- Centered card with lock icon
- Headline: "Unlock the Full Demo"
- Benefits list (Zero spam, Early access, 5 sec setup)
- Email input with icon
- Submit button with sparkle icon
- "No credit card required" disclaimer
Glassmorphism style, primary color accents
\`\`\`

### Prompt 5: Processing State (Loading)
\`\`\`
Design an analysis processing screen:
- 4-part progress cards in grid
- Each card shows: icon, part name, status
- Active part has pulsing indicator
- Overall progress bar with percentage
- Estimated time remaining
- System log terminal at bottom
- Animated background grid pattern
Cyberpunk/tech aesthetic, cyan accents
\`\`\`

### Prompt 6: Success Confirmation (Post-Purchase)
\`\`\`
Create a payment success page:
- Confetti animation (subtle)
- Checkmark icon with success message
- Order summary card
- "Check your email" instruction
- Magic link explanation
- CTA to view analysis
- Support contact link
Celebratory but professional tone
\`\`\`

### Prompt 7: Mobile Navigation (Responsive)
\`\`\`
Design mobile navigation for the app:
- Bottom tab bar with 4 items
- Icons: Home, Output, History, Profile
- Active state with label and highlight
- Floating action button for "New Analysis"
- Slide-out menu for secondary items
Touch-friendly, 44px minimum targets
\`\`\`

### Prompt 8: Error States (Recovery)
\`\`\`
Create error state components:
- 404 page with "Lost in the void" theme
- Payment failed with retry option
- Analysis error with support contact
- Network error with refresh button
- Empty states for no analyses
Maintain brand voice, helpful tone
\`\`\`

### Prompt 9: Testimonials Section (Social Proof)
\`\`\`
Design a testimonials carousel:
- "Intercepted Transmissions" header
- Cards with hex codes and timestamps
- Avatar, name, title, company
- Quote with specific metrics mentioned
- "Verified via blockchain" badge
- Auto-scroll with manual controls
Terminal/transmission aesthetic
\`\`\`

### Prompt 10: Admin Analytics (Internal)
\`\`\`
Create an admin dashboard:
- Revenue chart (line graph)
- Tier distribution (pie chart)
- Conversion funnel visualization
- Recent transactions table
- User growth metrics
- Quick stats cards at top
Data-dense but scannable layout
\`\`\``
  },
  part4: {
    title: "Risk, Metrics & Rationale",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500",
    gradient: "from-red-500/20 to-rose-500/20",
    borderColor: "border-red-500/30",
    content: `# Part 4: Risk, Metrics & Rationale

## Risk Assessment Matrix

### High Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI API costs exceed projections | Medium | High | Implement caching, optimize prompts, set usage limits |
| Low initial conversion rate | High | Medium | A/B test pricing, offer money-back guarantee |
| Competitor copies model | Medium | Medium | Build brand, community, iterate faster |
| AI hallucination in analysis | Low | High | Human review layer, confidence scoring |

### Medium Priority Risks

1. **Payment Processing Issues**
   - Risk: Stripe account restrictions for AI services
   - Mitigation: Maintain clear ToS, add crypto alternative

2. **Scaling Challenges**
   - Risk: Analysis queue bottlenecks during growth
   - Mitigation: Implement job queue (BullMQ), horizontal scaling

3. **User Churn**
   - Risk: One-time use without repeat purchases
   - Mitigation: Email nurturing, upgrade paths, new features

## Success Metrics Framework

### North Star Metric
**Analyses Completed per Week** - Directly correlates with revenue and value delivered

### Primary KPIs

| Metric | Target (Month 1) | Target (Month 6) |
|--------|------------------|------------------|
| Weekly Active Analyses | 50 | 500 |
| Conversion Rate | 2% | 5% |
| Average Revenue per User | $79 | $120 |
| Email Open Rate | 40% | 50% |
| NPS Score | 30 | 50 |

### Secondary Metrics

- Time to first analysis completion
- Support ticket volume
- Referral rate
- Feature adoption (PDF export, copy prompts)
- Mobile vs desktop usage

## Financial Projections

### Year 1 Revenue Model

\`\`\`
Month 1-3: Beta/Launch
- 100 analyses × $79 avg = $7,900/month
- Costs: $3,000 (AI) + $500 (infra) = $3,500
- Net: $4,400/month

Month 4-6: Growth
- 400 analyses × $99 avg = $39,600/month
- Costs: $8,000 (AI) + $1,000 (infra) + $2,000 (marketing)
- Net: $28,600/month

Month 7-12: Scale
- 1,000 analyses × $119 avg = $119,000/month
- Costs: $20,000 (AI) + $3,000 (infra) + $10,000 (team)
- Net: $86,000/month

Year 1 Total: ~$600,000 revenue, ~$400,000 net
\`\`\`

## Strategic Rationale

### Why This Will Work

1. **Timing**: AI capabilities have reached the threshold for quality analysis
2. **Price Point**: 10x cheaper than consultants, 10x more strategic than tools
3. **Speed**: 24-hour delivery vs 4-8 week traditional timeline
4. **Scalability**: Marginal cost per analysis approaches $5-10

### Competitive Moat

- **Data Flywheel**: Each analysis improves prompt quality
- **Brand**: First-mover in "AI UX strategist" category
- **Community**: Building around indie hackers and startup founders
- **Integration**: Deep ties to Figma, Notion, Linear ecosystems

### Exit Potential

- **Acquisition Targets**: Figma, Notion, Webflow, design agencies
- **Valuation Multiple**: 8-12x ARR for AI SaaS (2024 benchmarks)
- **Timeline**: 3-5 years to meaningful exit opportunity`
  }
};

// Figma prompts extracted for copy functionality
const FIGMA_PROMPTS = [
  { number: 1, title: "Homepage Hero", screen: "Landing Page", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 1:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 2, title: "Pricing Cards", screen: "Conversion", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 2:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 3, title: "Analysis Dashboard", screen: "User Portal", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 3:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 4, title: "Email Gate Modal", screen: "Lead Capture", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 4:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 5, title: "Processing State", screen: "Loading", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 5:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 6, title: "Success Confirmation", screen: "Post-Purchase", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 6:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 7, title: "Mobile Navigation", screen: "Responsive", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 7:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 8, title: "Error States", screen: "Recovery", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 8:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 9, title: "Testimonials Section", screen: "Social Proof", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 9:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
  { number: 10, title: "Admin Analytics", screen: "Internal", prompt: DEMO_ANALYSIS.part3.content.match(/### Prompt 10:[\s\S]*?```\n([\s\S]*?)```/)?.[1] || "" },
];

// Copy Button Component
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  }, [text]);
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 px-2 text-xs"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 mr-1 text-green-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 mr-1" />
          {label}
        </>
      )}
    </Button>
  );
}

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  badge,
  color = "text-foreground"
}: { 
  title: string; 
  icon?: React.ElementType; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badge?: string;
  color?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`h-5 w-5 ${color}`} />}
          <span className="font-medium">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
}

// Figma Prompt Card Component
function FigmaPromptCard({ 
  number, 
  title, 
  screen,
  prompt
}: { 
  number: number; 
  title: string; 
  screen: string;
  prompt: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="border border-yellow-500/30 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-yellow-500">{number}</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">{title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{screen}</p>
            </div>
          </div>
          <CopyButton text={prompt} label="Copy" />
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-yellow-500 hover:text-yellow-400 mt-3 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide prompt
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              View prompt
            </>
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-3 p-3 bg-black/30 rounded-lg border border-yellow-500/20">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
              {prompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoAnalysis() {
  const [, navigate] = useLocation();
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Spam protection
  const [activeTab, setActiveTab] = useState("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutation for saving email
  const subscribeEmail = trpc.emailSubscriber.subscribe.useMutation({
    onSuccess: (data) => {
      setEmailSubmitted(true);
      setEmailError("");
      localStorage.setItem("demo_email_submitted", "true");
      localStorage.setItem("demo_email", email);
      toast.success("Welcome! You now have full access to the demo.");
      if (data.isNew) {
        toast.info("Check your email for exclusive insights!", { duration: 5000 });
      }
    },
    onError: (error) => {
      setEmailError(error.message || "Failed to subscribe. Please try again.");
      setIsSubmitting(false);
    },
  });

  // Check if email was already submitted
  useEffect(() => {
    const submitted = localStorage.getItem("demo_email_submitted");
    if (submitted) {
      setEmailSubmitted(true);
    }
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check - if filled, it's a bot
    if (honeypot) {
      // Silently reject but pretend success
      setEmailSubmitted(true);
      localStorage.setItem("demo_email_submitted", "true");
      return;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    subscribeEmail.mutate({ email, source: "demo_analysis_gate" });
  };

  const PART_CONFIG = [
    { key: "part1", ...DEMO_ANALYSIS.part1 },
    { key: "part2", ...DEMO_ANALYSIS.part2 },
    { key: "part3", ...DEMO_ANALYSIS.part3 },
    { key: "part4", ...DEMO_ANALYSIS.part4 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <div className="hidden sm:block h-6 w-px bg-border" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">Demo Analysis</h1>
                <p className="text-xs text-muted-foreground">
                  Sample APEX Strategic Output
                </p>
              </div>
            </div>
            
            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              {emailSubmitted && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                    className="text-xs"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Output</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate("/dashboard")}
                    className="text-xs"
                  >
                    <History className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                </>
              )}
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/#pricing")}
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">New Analysis</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Problem Statement - Always visible */}
        <Card className="mb-6 glass-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Problem Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{DEMO_ANALYSIS.problemStatement}</p>
          </CardContent>
        </Card>

        {/* Tier Badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="tier-badge tier-badge-full">Syndicate</span>
          <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-cyan-400">
            APEX • Perplexity Powered
          </span>
          <span className="text-xs text-muted-foreground ml-2">Demo Analysis</span>
        </div>

        {/* Email Gate - Show if email not submitted */}
        {!emailSubmitted && (
          <Card className="mb-8 border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 overflow-hidden">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4 relative">
                  <Lock className="h-8 w-8 text-primary" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-ping" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Unlock the Full APEX Demo
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Enter your email to access the complete 4-part strategic analysis and see what you'll get with a real purchase.
                </p>

                {/* Benefits */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span>Zero Spam</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Early Access</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>5 Sec Setup</span>
                  </div>
                </div>

                {/* Email Form with Honeypot */}
                <form onSubmit={handleEmailSubmit} className="w-full max-w-md space-y-4">
                  {/* Honeypot field - hidden from users, visible to bots */}
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError("");
                      }}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Zap className="mr-2 h-4 w-4 animate-spin" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        Unlock Full Demo
                        <Sparkles className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-muted-foreground mt-4">
                  No credit card required • Unsubscribe anytime
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Content - Locked/Blurred if email not submitted */}
        <div className="relative">
          {/* Blur overlay if not submitted */}
          {!emailSubmitted && (
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-background/30 rounded-lg flex items-center justify-center">
              <div className="text-center p-8">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Enter your email above to unlock</p>
              </div>
            </div>
          )}
          
          <div className={!emailSubmitted ? "blur-md opacity-50 pointer-events-none select-none" : ""}>
            {/* Tabbed Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
                  <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
                  Overview
                </TabsTrigger>
                {PART_CONFIG.map((part, index) => {
                  const Icon = part.icon;
                  return (
                    <TabsTrigger 
                      key={part.key}
                      value={part.key} 
                      className="text-xs sm:text-sm py-2"
                    >
                      <Icon className={`h-4 w-4 mr-1 hidden sm:inline ${part.color}`} />
                      <span className="sm:hidden">P{index + 1}</span>
                      <span className="hidden sm:inline">Part {index + 1}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Executive Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-invert max-w-none">
                    <Streamdown>{DEMO_ANALYSIS.overview}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Part Tabs */}
              {PART_CONFIG.map((part, index) => {
                const Icon = part.icon;
                return (
                  <TabsContent key={part.key} value={part.key}>
                    <Card className={`glass-panel ${part.borderColor} bg-gradient-to-br ${part.gradient}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-lg ${part.bgColor}/20 flex items-center justify-center`}>
                              <Icon className={`h-5 w-5 ${part.color}`} />
                            </div>
                            <div>
                              <span className="block">Part {index + 1}: {part.title}</span>
                            </div>
                          </CardTitle>
                          <CopyButton text={part.content} label="Copy All" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        {part.key === "part3" ? (
                          // Special rendering for Part 3 with Figma prompts
                          <div className="space-y-6">
                            <div className="prose prose-invert max-w-none prose-sm">
                              <Streamdown>{part.content.split("## 10 Production-Ready Figma Prompts")[0]}</Streamdown>
                            </div>
                            
                            {/* Figma Prompts Section */}
                            <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-yellow-500/5 via-background to-orange-500/5">
                              <div className="p-6 border-b border-yellow-500/20">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                                      <Palette className="h-6 w-6 text-yellow-500" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-lg">10 Production-Ready Figma Prompts</h3>
                                      <p className="text-sm text-muted-foreground">Copy and paste directly into Figma AI</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                  {FIGMA_PROMPTS.map((prompt) => (
                                    <FigmaPromptCard
                                      key={prompt.number}
                                      number={prompt.number}
                                      title={prompt.title}
                                      screen={prompt.screen}
                                      prompt={prompt.prompt}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-invert max-w-none prose-sm">
                            <Streamdown>{part.content}</Streamdown>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-8 mt-8 text-center bg-gradient-to-br from-primary/10 via-background to-purple-500/10 border-primary/30">
          <h2 className="text-2xl font-bold mb-4">
            Get Your Own Strategic Analysis
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            This is just a demo. Get a complete APEX analysis tailored to your specific problem statement with actionable insights, strategic recommendations, and 10 custom Figma prompts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/#pricing")}>
              <Zap className="mr-2 h-4 w-4" />
              Start Your Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>
              Learn More
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
