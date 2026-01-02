import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Streamdown } from "streamdown";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  CheckCircle2,
  Lightbulb,
  Target,
  Layers,
  AlertTriangle,
  TrendingUp,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Palette,
  LayoutGrid,
  Shield,
  Users,
  Sparkles,
  BookOpen,
  Wrench,
  BarChart3,
  Brain,
  Rocket,
  Lock,
  Mail,
  ArrowRight,
  Plus
} from "lucide-react";
import { NewAnalysisModal } from "@/components/NewAnalysisModal";

// Part configuration with colors and icons
const PART_CONFIG = [
  { number: 1, name: "Discovery & Problem Analysis", icon: Target, color: "text-blue-500", bgColor: "bg-blue-500", gradient: "from-blue-500/20 to-cyan-500/20", borderColor: "border-blue-500/30", description: "Deep dive into the problem space and user needs" },
  { number: 2, name: "Strategic Design & Roadmap", icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500", gradient: "from-purple-500/20 to-pink-500/20", borderColor: "border-purple-500/30", description: "Design strategy and implementation roadmap" },
  { number: 3, name: "AI Toolkit & Figma Prompts", icon: Lightbulb, color: "text-yellow-500", bgColor: "bg-yellow-500", gradient: "from-yellow-500/20 to-orange-500/20", borderColor: "border-yellow-500/30", description: "Practical tools and 10 production-ready prompts" },
  { number: 4, name: "Risk, Metrics & Rationale", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500", gradient: "from-red-500/20 to-rose-500/20", borderColor: "border-red-500/30", description: "Risk assessment and success metrics" },
];

// Section icons mapping
const SECTION_ICONS: Record<string, React.ElementType> = {
  "Executive Summary": Sparkles,
  "Adaptive Problem Analysis": Brain,
  "Core Problem Statement": Target,
  "Tailored Methodology": BookOpen,
  "Assumption Ledger": BarChart3,
  "Service Blueprint": LayoutGrid,
  "Phase-by-Phase Roadmap": Rocket,
  "AI-Enhanced Execution Toolkit": Wrench,
  "Deliverables Framework": FileText,
  "Figma AI Prompts": Palette,
  "Team & Collaboration": Users,
  "Risk Mitigation": Shield,
  "Success Metrics": TrendingUp,
};

// Demo content - rich sample APEX analysis
const DEMO_PROBLEM_STATEMENT = "I want to build a SaaS platform that provides AI-powered strategic UX analysis for startups and product teams, helping them validate ideas and create actionable roadmaps.";

const DEMO_OVERVIEW = `## Executive Summary

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

**Projected ROI:** 3.2x within 18 months based on conservative customer acquisition estimates.`;

const DEMO_PART1 = `## Adaptive Problem Analysis

### Core Problem Statement
The startup ecosystem lacks accessible, affordable strategic UX guidance. Traditional consulting is expensive ($150-500/hour) and slow (2-4 week engagements). Founders need rapid validation and actionable insights, not lengthy reports.

### Market Context
- 77% of startups fail due to poor product-market fit
- Average seed-stage startup spends $15,000+ on UX consulting annually
- 89% of founders report feeling "lost" when making product decisions
- AI-powered tools are gaining trust: 67% of product teams now use AI in their workflow

### User Personas

**Primary: The Bootstrapped Founder**
- Solo or small team (1-3 people)
- Technical background, limited design experience
- Budget-conscious, values speed over perfection
- Needs: Quick validation, actionable next steps

**Secondary: The Product Manager**
- Works at Series A-B startup
- Has some design resources but needs strategic direction
- Accountable for roadmap decisions
- Needs: Data-backed recommendations, stakeholder-ready outputs

### Competitive Landscape
| Competitor | Pricing | Delivery | Weakness |
|------------|---------|----------|----------|
| Traditional Consulting | $5,000-50,000 | 2-4 weeks | Cost, speed |
| Fiverr/Upwork | $500-2,000 | 1-2 weeks | Quality variance |
| AI Tools (ChatGPT) | Free-$20/mo | Instant | Generic, no framework |
| **Our Solution** | $29-199 | 24 hours | New entrant |

### Assumption Ledger
1. ✅ Founders will trust AI-generated strategic advice (validated via surveys)
2. ⚠️ Users will pay premium for structured output vs. raw AI chat
3. ✅ 24-hour delivery is fast enough for decision-making
4. ❓ Integration with existing tools will drive retention`;

const DEMO_PART2 = `## Strategic Design & Roadmap

### Service Blueprint

**Customer Journey Map:**
\`\`\`
Discovery → Evaluation → Purchase → Onboarding → Analysis → Delivery → Action
   |            |           |           |           |          |         |
   v            v           v           v           v          v         v
Landing    Demo/Free    Checkout    Problem     AI        Results   Figma
 Page       Trial       Flow       Statement  Processing  Page     Export
\`\`\`

### Phase-by-Phase Roadmap

**Phase 1: MVP (Weeks 1-8)**
- Core analysis engine with Perplexity API
- Single-tier offering (Syndicate)
- Basic payment integration (Stripe)
- Email delivery system
- Landing page with social proof

**Phase 2: Growth (Weeks 9-16)**
- Multi-tier pricing (Observer, Insider, Syndicate)
- User dashboard and history
- Figma plugin integration
- Referral program
- A/B testing framework

**Phase 3: Scale (Weeks 17-24)**
- Team/enterprise features
- White-label options
- API access for agencies
- Advanced analytics
- Community features

### Technical Architecture
\`\`\`
Frontend (React + Tailwind)
    ↓
API Layer (tRPC)
    ↓
Analysis Engine
    ├── Perplexity API (Research)
    ├── Claude API (Synthesis)
    └── Custom Prompts (Framework)
    ↓
Database (PostgreSQL)
    ↓
Delivery (Email + Dashboard)
\`\`\`

### Key Metrics to Track
- Time to First Value (TTFV): Target < 5 minutes
- Analysis Completion Rate: Target > 95%
- Customer Satisfaction (CSAT): Target > 4.5/5
- Net Promoter Score (NPS): Target > 50`;

const DEMO_PART3 = `## AI-Enhanced Execution Toolkit

### Recommended AI Tools
- **Content Generation:** GPT-4 for analysis, Claude for long-form
- **Research:** Perplexity sonar-pro for real-time web data
- **Design:** Figma AI, Midjourney for assets
- **Code:** GitHub Copilot, Cursor for development
- **Testing:** Playwright for E2E, Vitest for unit tests
- **Analytics:** PostHog for product analytics

### Automation Workflows

**Analysis Pipeline:**
1. User submits problem statement
2. Perplexity researches market context
3. Claude synthesizes findings into framework
4. GPT-4 generates actionable recommendations
5. System compiles into structured output

### Deliverables Framework
- Executive Summary (1 page)
- Full Analysis Report (10-15 pages)
- Action Item Checklist
- 10 Figma AI Prompts
- Resource Links & References

## 10 Production-Ready Figma Prompts

Copy and paste these directly into Figma AI for instant high-fidelity mockups:`;

const DEMO_PART4 = `## Risk, Metrics & Rationale

### Risk Mitigation Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI output quality variance | Medium | High | Human review layer, quality scoring |
| API cost overruns | Low | Medium | Usage caps, tiered pricing |
| Competitor copying | High | Medium | Speed to market, brand building |
| User trust issues | Medium | High | Transparency, case studies, guarantees |
| Technical scaling | Low | High | Cloud-native architecture, caching |

### Success Metrics Framework

**North Star Metric:** Monthly Recurring Revenue (MRR)

**Leading Indicators:**
- Website traffic → Demo requests → Purchases
- Analysis completion rate
- User return rate (30-day)

**Lagging Indicators:**
- Revenue growth (MoM)
- Customer lifetime value (LTV)
- Churn rate

### Financial Projections

**Year 1 Targets:**
- Month 1-3: 50 customers, $5,000 MRR
- Month 4-6: 200 customers, $20,000 MRR
- Month 7-12: 500 customers, $50,000 MRR

**Unit Economics:**
- Customer Acquisition Cost (CAC): $50
- Lifetime Value (LTV): $250
- LTV:CAC Ratio: 5:1 ✅

### Strategic Rationale

**Why Now?**
1. AI capabilities have reached "good enough" threshold
2. Economic downturn increases demand for affordable consulting
3. Remote work normalized async, AI-powered services
4. First-mover advantage in AI + UX intersection

**Why Us?**
1. Deep understanding of startup pain points
2. Technical capability to build and iterate fast
3. Framework-based approach provides consistency
4. Commitment to actionable, not theoretical, outputs`;

// Demo Figma prompts
const DEMO_FIGMA_PROMPTS = [
  { number: 1, title: "Homepage Hero", screen: "Landing Page", description: "High-converting hero section with dual CTAs for different user paths", prompt: "Design a dark-themed SaaS landing page hero section for an AI-powered UX analysis platform. Include: gradient background (purple to blue), bold headline 'Stop building in the dark. Validate your idea today.', subheadline about transforming problem statements into strategies, two CTA buttons (primary: 'Start Analysis' with lightning icon, secondary: 'View Demo'), floating UI elements showing analysis snippets, trust badges (Stripe, Vercel logos). Modern, premium feel with subtle animations." },
  { number: 2, title: "Pricing Cards", screen: "Conversion", description: "Three-tier pricing with feature comparison and urgency elements", prompt: "Create a pricing section with 3 tiers: Observer ($29), Insider ($79), Syndicate ($199). Dark theme with glass-morphism cards. Syndicate card highlighted with gradient border and 'Most Popular' badge. Each card shows: tier name, price, feature list with checkmarks, CTA button. Include comparison table below. Add subtle glow effects on hover. Professional SaaS aesthetic." },
  { number: 3, title: "Analysis Dashboard", screen: "User Portal", description: "Main dashboard showing analysis status and quick actions", prompt: "Design a user dashboard for viewing AI analysis results. Dark theme with sidebar navigation. Main area shows: current analysis card with progress indicator, 4-part analysis tabs (Discovery, Strategy, Toolkit, Risk), quick stats panel, recent analyses list. Include status badges (Processing, Completed), export buttons, and 'New Analysis' CTA. Clean, data-rich interface." },
  { number: 4, title: "Email Gate Modal", screen: "Lead Capture", description: "Email capture modal with value proposition and trust elements", prompt: "Create an email gate modal for unlocking demo content. Dark theme with gradient glow border. Include: lock icon, headline 'Unlock the Full APEX Demo', description about 4-part analysis access, email input field with mail icon, submit button 'Unlock Full Demo', trust badges (Zero Spam, Early Access, 5 Sec Setup), skip link. Elegant, non-intrusive design." },
  { number: 5, title: "Processing State", screen: "Loading", description: "Analysis processing screen with real-time progress updates", prompt: "Design an analysis processing screen showing AI at work. Dark theme with animated elements. Include: central progress indicator with percentage, 4-step progress bar (Part 1-4), current step highlight with pulse animation, estimated time remaining, system log showing real-time updates, 'Powered by Perplexity' badge. Futuristic, tech-forward aesthetic." },
  { number: 6, title: "Success Confirmation", screen: "Post-Purchase", description: "Payment success page with next steps and celebration", prompt: "Create a payment success page with celebration elements. Dark theme with confetti animation. Include: large checkmark with glow, 'Payment Successful!' headline, order summary card, 'What happens next' timeline (3 steps), email notification preview, 'View Analysis' primary CTA, 'Return Home' secondary link. Warm, celebratory mood." },
  { number: 7, title: "Mobile Navigation", screen: "Responsive", description: "Bottom navigation bar optimized for mobile users", prompt: "Design a mobile bottom navigation bar for the analysis platform. Dark theme, 5 items: Home, Demo, Output, History, Menu. Active state with gradient highlight and icon fill. Include notification badge on Output when analysis ready. Thumb-friendly touch targets, subtle backdrop blur. iOS/Android hybrid style." },
  { number: 8, title: "Error States", screen: "Recovery", description: "Error handling screens for various failure scenarios", prompt: "Create error state designs for: payment failed, analysis error, network timeout. Dark theme with appropriate warning colors. Each includes: icon (warning/error), clear headline, helpful description, primary action button, secondary support link. Maintain brand consistency while clearly communicating issues. Non-alarming, solution-focused tone." },
  { number: 9, title: "Testimonials Section", screen: "Social Proof", description: "Customer testimonials with verification badges", prompt: "Design a testimonials section with 4 customer quotes. Dark theme with card layout. Each testimonial: quote text, customer name/title, company logo, star rating, 'Verified Purchase' badge. Include section header 'Trusted by 500+ Teams', rotating animation. Mix of founder and PM personas. Authentic, trustworthy presentation." },
  { number: 10, title: "Admin Analytics", screen: "Internal", description: "Admin dashboard with revenue and usage analytics", prompt: "Create an admin analytics dashboard. Dark theme with data visualization. Include: revenue chart (line graph), tier distribution (pie chart), recent transactions table, conversion funnel, active users count, MRR display. Filter controls for date range. Clean data presentation with actionable insights. Internal tool aesthetic." },
];

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  badge,
  color = "text-foreground",
  locked = false
}: { 
  title: string; 
  icon?: React.ElementType; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badge?: string;
  color?: string;
  locked?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`border border-border/50 rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm ${locked ? 'opacity-60' : ''}`}>
      <button
        onClick={() => !locked && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${locked ? 'cursor-not-allowed' : ''}`}
        disabled={locked}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className={`h-5 w-5 ${color}`} />}
          <span className="font-medium">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {badge}
            </span>
          )}
          {locked && <Lock className="h-4 w-4 text-muted-foreground ml-2" />}
        </div>
        {!locked && (isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ))}
      </button>
      {isOpen && !locked && (
        <div className="p-4 pt-0 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
}

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

// Figma Prompt Card Component
function FigmaPromptCard({ 
  number, 
  title, 
  description, 
  prompt,
  screen,
  locked = false
}: { 
  number: number; 
  title: string; 
  description: string; 
  prompt: string;
  screen: string;
  locked?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`border border-yellow-500/30 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-500/5 to-orange-500/5 ${locked ? 'opacity-60' : ''}`}>
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
          {!locked && <CopyButton text={prompt} label="Copy" />}
          {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">{description}</p>
        
        {!locked && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

// Email Gate Modal Component
function EmailGateModal({ 
  isOpen, 
  onSubmit, 
  isSubmitting 
}: { 
  isOpen: boolean; 
  onSubmit: (email: string) => void;
  isSubmitting: boolean;
}) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Bot detected
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    onSubmit(email);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-30 animate-pulse" />
        
        <Card className="relative bg-background/95 backdrop-blur border-cyan-500/30">
          <CardContent className="pt-8 pb-6 px-6">
            <div className="text-center space-y-4">
              {/* Lock icon with glow */}
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-cyan-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 animate-ping" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500" />
              </div>

              <div>
                <h2 className="text-2xl font-bold">Unlock the Full APEX Demo</h2>
                <p className="text-muted-foreground mt-2">
                  Enter your email to access the complete 4-part strategic analysis and see what you'll get with a real purchase.
                </p>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-green-500" />
                  Zero Spam
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Early Access
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  5 Sec Setup
                </span>
              </div>

              {/* Email form */}
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                {/* Honeypot field - hidden from users */}
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute -left-[9999px]"
                  tabIndex={-1}
                  autoComplete="off"
                />
                
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border/50"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      Unlock Full Demo
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground">
                No credit card required • Unsubscribe anytime
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DemoAnalysis() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isExporting, setIsExporting] = useState(false);
  const [showNewAnalysisModal, setShowNewAnalysisModal] = useState(false);
  
  // Email gate state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasTriggeredGate, setHasTriggeredGate] = useState(false);

  // Check localStorage for previous unlock
  useEffect(() => {
    const unlocked = localStorage.getItem("demo_analysis_unlocked");
    if (unlocked === "true") {
      setIsUnlocked(true);
    }
  }, []);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);

      // Trigger email gate at 50% scroll if not already unlocked
      if (progress >= 50 && !isUnlocked && !hasTriggeredGate) {
        setShowEmailGate(true);
        setHasTriggeredGate(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isUnlocked, hasTriggeredGate]);

  // tRPC mutation for saving email
  const subscribeEmail = trpc.emailSubscriber.subscribe.useMutation({
    onSuccess: () => {
      setIsUnlocked(true);
      setShowEmailGate(false);
      localStorage.setItem("demo_analysis_unlocked", "true");
      toast.success("Demo unlocked! Check your email for exclusive insights.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to subscribe. Please try again.");
    },
  });

  const handleEmailSubmit = (email: string) => {
    subscribeEmail.mutate({ email, source: "demo_analysis_gate" });
  };

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!isUnlocked) {
      setShowEmailGate(true);
      return;
    }
    
    setIsExporting(true);
    try {
      let markdown = `# APEX Strategic Analysis Demo\n\n`;
      markdown += `**Problem Statement:**\n${DEMO_PROBLEM_STATEMENT}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Overview\n${DEMO_OVERVIEW}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 1: Discovery & Problem Analysis\n${DEMO_PART1}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 2: Strategic Design & Roadmap\n${DEMO_PART2}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 3: AI Toolkit & Figma Prompts\n${DEMO_PART3}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 4: Risk, Metrics & Rationale\n${DEMO_PART4}\n\n`;
      
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apex-demo-analysis.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Demo analysis exported!");
    } catch (error) {
      toast.error("Failed to export");
    } finally {
      setIsExporting(false);
    }
  }, [isUnlocked]);

  return (
    <div className="min-h-screen bg-background">
      {/* Email Gate Modal */}
      <EmailGateModal 
        isOpen={showEmailGate} 
        onSubmit={handleEmailSubmit}
        isSubmitting={subscribeEmail.isPending}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Home
            </Button>
            <div>
              <h1 className="text-lg font-bold">Demo Analysis</h1>
              <p className="text-xs text-muted-foreground">Sample APEX Strategic Output</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isUnlocked && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Output
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  History
                </Button>
              </>
            )}
            <Button 
              className="bg-primary hover:bg-primary/90"
              size="sm"
              onClick={() => setShowNewAnalysisModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </div>
        </div>
        
        {/* Scroll progress bar */}
        <div className="h-0.5 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      {/* New Analysis Modal */}
      <NewAnalysisModal 
        open={showNewAnalysisModal} 
        onOpenChange={setShowNewAnalysisModal}
        onSuccess={(sessionId) => navigate(`/checkout/${sessionId}`)}
      />

      <main className="container py-6 space-y-6">
        {/* Problem Statement */}
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Problem Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{DEMO_PROBLEM_STATEMENT}</p>
          </CardContent>
        </Card>

        {/* Tier Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full">
            SYNDICATE
          </span>
          <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-cyan-400">
            APEX • Perplexity Powered
          </span>
          <span className="text-xs text-muted-foreground">Demo Analysis</span>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            {PART_CONFIG.map((part) => (
              <TabsTrigger 
                key={part.number}
                value={`part${part.number}`} 
                className="text-xs sm:text-sm py-2"
              >
                <part.icon className={`h-4 w-4 mr-1 hidden sm:inline ${part.color}`} />
                <span className="sm:hidden">P{part.number}</span>
                <span className="hidden sm:inline">Part {part.number}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Executive Overview
                  </CardTitle>
                  {isUnlocked && <CopyButton text={DEMO_OVERVIEW} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent className="prose prose-invert max-w-none">
                <Streamdown>{DEMO_OVERVIEW}</Streamdown>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Part 1 Tab */}
          <TabsContent value="part1">
            <Card className={`glass-panel ${PART_CONFIG[0].borderColor} bg-gradient-to-br ${PART_CONFIG[0].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[0].bgColor}/20 flex items-center justify-center`}>
                      <Target className={`h-5 w-5 ${PART_CONFIG[0].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 1: {PART_CONFIG[0].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[0].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={DEMO_PART1} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{DEMO_PART1}</Streamdown>
                </div>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Enter your email above to unlock</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Part 2 Tab */}
          <TabsContent value="part2">
            <Card className={`glass-panel ${PART_CONFIG[1].borderColor} bg-gradient-to-br ${PART_CONFIG[1].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[1].bgColor}/20 flex items-center justify-center`}>
                      <Layers className={`h-5 w-5 ${PART_CONFIG[1].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 2: {PART_CONFIG[1].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[1].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={DEMO_PART2} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{DEMO_PART2}</Streamdown>
                </div>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Enter your email above to unlock</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Part 3 Tab - Figma Prompts */}
          <TabsContent value="part3">
            <Card className={`glass-panel ${PART_CONFIG[2].borderColor} bg-gradient-to-br ${PART_CONFIG[2].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[2].bgColor}/20 flex items-center justify-center`}>
                      <Lightbulb className={`h-5 w-5 ${PART_CONFIG[2].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 3: {PART_CONFIG[2].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[2].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={DEMO_PART3} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Toolkit Section */}
                <CollapsibleSection 
                  title="AI-Enhanced Execution Toolkit" 
                  icon={Wrench}
                  defaultOpen={true}
                  badge="6 Tools"
                  color="text-yellow-500"
                  locked={!isUnlocked}
                >
                  <div className="prose prose-invert max-w-none prose-sm">
                    <Streamdown>{DEMO_PART3}</Streamdown>
                  </div>
                </CollapsibleSection>

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
                      {isUnlocked && (
                        <div className="flex items-center gap-2">
                          <CopyButton 
                            text={DEMO_FIGMA_PROMPTS.map(p => `${p.number}. ${p.title}\n${p.prompt}`).join('\n\n')} 
                            label="Copy All" 
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                          >
                            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {DEMO_FIGMA_PROMPTS.map((prompt) => (
                        <FigmaPromptCard
                          key={prompt.number}
                          number={prompt.number}
                          title={prompt.title}
                          description={prompt.description}
                          prompt={prompt.prompt}
                          screen={prompt.screen}
                          locked={!isUnlocked}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Part 4 Tab */}
          <TabsContent value="part4">
            <Card className={`glass-panel ${PART_CONFIG[3].borderColor} bg-gradient-to-br ${PART_CONFIG[3].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[3].bgColor}/20 flex items-center justify-center`}>
                      <AlertTriangle className={`h-5 w-5 ${PART_CONFIG[3].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 4: {PART_CONFIG[3].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[3].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={DEMO_PART4} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{DEMO_PART4}</Streamdown>
                </div>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Enter your email above to unlock</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA Section */}
        <Card className="glass-panel border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Get Your Own Strategic Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    This is just a demo. Get a complete APEX analysis tailored to your specific problem statement with actionable insights, strategic recommendations, and 10 custom Figma prompts.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                  onClick={() => setShowNewAnalysisModal(true)}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Your Analysis
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Learn More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
