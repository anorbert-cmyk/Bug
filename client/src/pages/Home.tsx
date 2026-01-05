import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  CreditCard,
  Crown,
  Eye,
  HelpCircle,
  LayoutDashboard,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TIER_CONFIGS, type Tier } from "@shared/pricing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Admin wallet address from environment
const ADMIN_WALLET = (import.meta.env.VITE_ADMIN_WALLET_ADDRESS || "").toLowerCase();

// Helper to shorten wallet address
const shortenAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, navigate] = useLocation();
  const [problemStatement, setProblemStatement] = useState("");
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Honeypot spam protection
  const [honeypot, setHoneypot] = useState("");

  // Priority tracking from email campaign
  const [isPriority, setIsPriority] = useState(false);

  // Check for priority parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const priorityParam = urlParams.get('priority');
    if (priorityParam === 'PRIORITY') {
      setIsPriority(true);
      // Store in sessionStorage so it persists through checkout
      sessionStorage.setItem('prioritySource', 'email_campaign_dec2024');
      toast.success('Priority access activated! Your analysis will be processed first.', {
        duration: 5000,
      });
    }
  }, []);


  // MetaMask wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const hasMetaMask = typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined";

  // Check for existing wallet connection on mount - NO auto redirect
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (hasMetaMask) {
        try {
          const accounts = await (window as any).ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            const address = accounts[0].toLowerCase();
            setWalletAddress(address);
            // Just show the wallet address, don't auto-redirect
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };
    checkWalletConnection();
  }, [hasMetaMask]);

  // Listen for account changes - NO auto redirect
  useEffect(() => {
    if (hasMetaMask) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWalletAddress(null);
        } else {
          const address = accounts[0].toLowerCase();
          setWalletAddress(address);
          // Just update wallet address, don't auto-redirect
        }
      };

      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        (window as any).ethereum.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, [hasMetaMask]);

  // Connect wallet function
  const connectWallet = async () => {
    if (!hasMetaMask) {
      toast.error("MetaMask not found", {
        description: "Please install MetaMask to connect your wallet"
      });
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setIsConnectingWallet(true);

    try {
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts"
      });

      if (accounts.length > 0) {
        const address = accounts[0].toLowerCase();
        setWalletAddress(address);

        // Check if admin wallet
        if (address === ADMIN_WALLET && ADMIN_WALLET) {
          toast.success("Admin wallet detected", {
            description: "Redirecting to admin dashboard..."
          });
          navigate("/admin");
        } else {
          toast.success("Wallet connected", {
            description: shortenAddress(address)
          });
        }
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      if (error.code === 4001) {
        toast.error("Connection rejected", {
          description: "You rejected the connection request"
        });
      } else {
        toast.error("Connection failed", {
          description: error.message || "Failed to connect wallet"
        });
      }
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    setWalletAddress(null);
    toast.info("Wallet disconnected");
  };

  const createSession = trpc.session.create.useMutation({
    onSuccess: (data) => {
      const priorityParam = isPriority ? '&priority=true' : '';
      navigate(`/checkout/${data.sessionId}?tier=${selectedTier}${priorityParam}`);
    },
  });

  const handleStartAnalysis = (tier: Tier) => {
    // Spam protection - if honeypot is filled, silently reject
    if (honeypot) {
      toast.success("Analysis started!"); // Fake success to confuse bots
      return;
    }
    if (!problemStatement.trim()) {
      return;
    }
    setSelectedTier(tier);
    const prioritySource = sessionStorage.getItem('prioritySource');
    createSession.mutate({
      problemStatement: problemStatement.trim(),
      tier,
      isPriority: isPriority,
      prioritySource: prioritySource || undefined,
    });
  };

  const faqs = [
    {
      question: "How does the validation machine work?",
      answer:
        "We don't just 'analyze'. We run your problem statement through a 4-phase adversarial stress-test. 1) Discovery & Problem Anatomy. 2) Strategic Design & Roadmap. 3) AI Toolkit & Prompts. 4) Risk Assessment & ROI. It's not advice; it's a simulation of your product's market reality.",
    },
    {
      question: "Is my IP safe?",
      answer:
        "Your ideas are processed in an ephemeral, encrypted environment. We are not a VC firm; we don't pick winners, we build them. Your IP remains 100% yours, analyzed by machines, not humans.",
    },
    {
      question: "What exactly do I get?",
      answer:
        "Zero fluff. You get a dense, tactical markdown report. Executive Summary, Market Math, Competitor Kill-Chain, Tech Stack, 10 Production-Ready Figma Prompts, and a Risk Matrix. It's the document you wish you had before you started coding.",
    },
    {
      question: "Can I upgrade later?",
      answer:
        "No. Each tier triggers a different depth of cognitive processing. The Syndicate tier doesn't just add more text; it uses a more expensive, deeper reasoning chain (APEX). Choose the level of certainty you can afford.",
    },
    {
      question: "Refund policy?",
      answer:
        "Since we burn significant GPU compute to generate your unique strategy instantly, all sales are final. We provided a full Demo Analysis so you know exactly what the output looks like. We sell certainty, not refunds.",
    },
    {
      question: "Is this better than a human consultant?",
      answer:
        "A human consultant costs $15k, takes 4 weeks, and gives you their opinion. ValidateStrategy costs $99, takes 24 hours, and gives you data-backed patterns from Nielsen Norman & Baymard. You decide which is better math.",
    },
    {
      question: "Why should I trust this?",
      answer:
        "Don't. Trust the logic. Read the demo. If you can't see the value of validatng your idea for the price of a dinner, you probably shouldn't be building a startup.",
    },
    {
      question: "Who is this for?",
      answer:
        "Founders who value their time. If you'd rather spend 6 months building the wrong thing than 24 hours validating the right thing, this isn't for you.",
    },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Noise Texture */}
      <div className="bg-noise" />

      {/* Fractal Blob Background */}
      <div className="fractal-container">
        <div className="fractal-blob blob-1" />
        <div className="fractal-blob blob-2" />
        <div className="fractal-blob blob-3" />
      </div>

      {/* Navigation - Brutalist Technical */}
      <nav className="sticky top-6 z-40 mx-auto max-w-[95%] px-2 sm:px-4">
        <div className="border border-border bg-card/95 backdrop-blur-sm px-3 sm:px-5 py-2 sm:py-2.5 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
            <div className="w-6 h-6 border border-primary/50 bg-primary/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-tight font-mono hidden sm:inline">VALIDATE<span className="text-primary">STRATEGY</span></span>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
            {/* Admin Link - only visible for admin wallet */}
            {walletAddress && walletAddress === ADMIN_WALLET && ADMIN_WALLET && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-1.5 text-amber-400 hover:text-amber-300 px-2 sm:px-3"
              >
                <LayoutDashboard className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span className="hidden xs:inline">Admin</span>
              </Button>
            )}

            {/* Demo Analysis Link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/demo-analysis")}
              className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 sm:gap-1.5 text-cyan-400 hover:text-cyan-300 px-2 sm:px-3"
            >
              <Eye className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="hidden xs:inline">Demo</span>
            </Button>

            {/* Theme Toggle - simplified on mobile */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 sm:hidden rounded-full bg-muted/50 border border-border"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-yellow-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </button>

            {/* Theme Toggle - full on desktop */}
            <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-1.5 py-1.5 rounded-full border border-border">
              <Sun className="w-3.5 h-3.5 text-yellow-500" />
              <button
                onClick={toggleTheme}
                className="relative w-10 h-5 bg-muted rounded-full transition-colors duration-300 hover:bg-muted/80"
                aria-label="Toggle theme"
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-foreground rounded-full transition-transform duration-300 shadow-lg ${theme === "dark" ? "translate-x-0" : "translate-x-5"
                    }`}
                />
              </button>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            </div>

            {/* Connect Wallet / User */}
            {walletAddress ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectWallet}
                className="text-[9px] sm:text-[10px] font-bold py-1 sm:py-1.5 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 font-mono"
              >
                <Wallet className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-green-500" />
                <span className="hidden xs:inline">{shortenAddress(walletAddress)}</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={connectWallet}
                disabled={isConnectingWallet}
                className="text-[9px] sm:text-[10px] font-bold py-1 sm:py-1.5 px-2 sm:px-3 flex items-center gap-1 sm:gap-2"
              >
                {isConnectingWallet ? (
                  <>
                    <Loader2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-spin" />
                    <span className="hidden sm:inline">CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    <span className="hidden xs:inline">CONNECT</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Brutalist Technical */}
      <section className="pt-28 pb-24 relative z-10">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="max-w-5xl mx-auto px-4 relative">
          {/* Status Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-4 py-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">System Online · 24h Turnaround</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 leading-[0.9]">
              <span className="block text-foreground">STOP GUESSING.</span>
              <span className="block text-primary">VALIDATE STRATEGY.</span>
            </h1>
          </div>

          {/* Terminal-Style Subheadline */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="border border-border bg-card/50 p-4 font-mono text-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50" aria-hidden="true">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] text-muted-foreground ml-2">validate_strategy.sh</span>
              </div>
              <h2 className="text-muted-foreground text-base md:text-lg font-normal m-0 p-0">
                <span className="text-primary">$</span> Get <strong className="font-medium text-foreground">boardroom-ready product strategy</strong> and <strong className="font-medium text-foreground">UX validation</strong> in <span className="text-foreground font-medium">24 hours</span>. Stop building blind.
              </h2>
              <p className="text-muted-foreground/70 mt-2">
                <span className="text-primary">$</span> Backed by research from <span className="text-foreground font-medium">Nielsen Norman</span> & <span className="text-foreground font-medium">Baymard Institute</span>.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-6 items-center">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <Button
                onClick={() =>
                  document.getElementById("protocol")?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-base font-mono uppercase tracking-wider flex items-center gap-3 group border-0"
              >
                <span className="text-primary-foreground/70">&gt;</span>
                START VALIDATION
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                onClick={() => navigate("/demo-analysis")}
                variant="outline"
                className="px-6 py-4 text-base font-mono uppercase tracking-wider flex items-center gap-2 border-2 border-border hover:border-primary/50"
              >
                <Eye className="w-4 h-4" />
                VIEW DEMO
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-6 text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500" />
                <span>Zero-Knowledge Privacy</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-cyan-500" />
                <span>Research-Backed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Physics of Product Success - Brutalist Data Dashboard */}
      <section className="py-24 relative z-10 border-y border-border bg-card/30">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-1 mb-4">
                <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Live Metrics</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                The Physics of <span className="text-primary">Product Success</span>
              </h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono md:text-right max-w-xs">
              We engineered the luck out of the equation.
            </p>
          </div>

          {/* Data Grid - Terminal Style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {/* Metric 1: Survival Rate */}
            <div className="bg-card p-6 md:p-8 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Survival Rate</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold font-mono tracking-tighter text-foreground mb-2">
                3<span className="text-2xl text-primary">x</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                higher market survival probability
              </p>
            </div>

            {/* Metric 2: User Retention */}
            <div className="bg-card p-6 md:p-8 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Day-30 Retention</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold font-mono tracking-tighter text-foreground mb-2">
                88<span className="text-2xl text-primary">%</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                improvement in user stickiness
              </p>
            </div>

            {/* Metric 3: Capital Efficiency */}
            <div className="bg-card p-6 md:p-8 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Capital Efficiency</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold font-mono tracking-tighter text-foreground mb-2">
                <span className="text-2xl text-primary">$</span>100
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                saved for every $1 invested
              </p>
            </div>

            {/* Metric 4: Speed to Learn */}
            <div className="bg-card p-6 md:p-8 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Speed to Learn</span>
              </div>
              <div className="text-5xl md:text-6xl font-bold font-mono tracking-tighter text-foreground mb-2">
                30<span className="text-2xl text-primary">%</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                faster loop from idea to revenue
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Process Section (Brutalist Technical) */}
      <section className="py-32 relative z-10 border-y border-border bg-muted/20">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-16">
            <div>
              <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-1 mb-4">
                <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Execution Protocol</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Your Path to <span className="text-primary">Validated Success</span>
              </h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono md:text-right max-w-xs">
              From Vision to Strategy in 3 Simple Steps
            </p>
          </div>

          {/* Process Grid - Technical Spec Style */}
          <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
            {/* Step 1 */}
            <div className="bg-card p-8 relative group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl font-mono font-bold text-primary">01</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">Describe Problem</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Write your <strong className="text-foreground">problem statement in 2-3 sentences</strong>. Be specific about your challenge, target market, or the solution you're exploring.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground">2-3 Sentences</span>
                <span className="px-2 py-1 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground">Be Specific</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-card p-8 relative group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl font-mono font-bold text-primary">02</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">Secure Payment</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Choose your analysis tier and complete payment via <strong className="text-foreground">Crypto</strong>. Card payments coming soon. Your transaction is encrypted and secure.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground">SSL Encrypted</span>
                <span className="px-2 py-1 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground">Instant</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-card p-8 relative group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl font-mono font-bold text-primary">03</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide">AI Delivery</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Our multi-agent AI processes your problem through <strong className="text-foreground">4 phases</strong>. Receive your report via <strong className="text-foreground">email</strong> and dashboard.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground">Real-time</span>
                <span className="px-2 py-1 text-[10px] font-mono uppercase bg-muted border border-border text-muted-foreground">Multi-Agent</span>
              </div>
            </div>
          </div>

          {/* Timeline indicator */}
          <div className="mt-12 flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 border border-border bg-card">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground font-mono">
                Average delivery time: <strong className="text-foreground">Under 24 hours</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* The Pipeline / Input Section */}
      <section id="protocol" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-2  tracking-tight">
              AI Product Validation Process
            </h2>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
              From Idea to Strategic Roadmap
            </p>
          </div>

          {/* Input Section */}
          <div className="max-w-2xl mx-auto mb-20 relative group">
            {/* Decorative Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur opacity-50 transition duration-1000 group-hover:opacity-75" />

            <div className="relative glass-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Problem Input Terminal
                </span>
              </div>

              <Textarea
                id="problemInput"
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="// Enter your challenge here...&#10;> e.g. 'Automate my client reporting flow'&#10;> or 'Design a fintech onboarding UX'"
                className="min-h-[150px] bg-background/50 border-border font-mono text-sm resize-none"
              />

              {/* Honeypot field - hidden from users, visible to bots */}
              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="absolute -left-[9999px] opacity-0 pointer-events-none"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between mt-4 text-xs font-mono">
                <span className={problemStatement.length < 200 ? "text-amber-400" : "text-green-400"}>
                  {problemStatement.length} / 2000 characters {problemStatement.length < 200 && `(min. 200 recommended)`}
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  End-to-end encrypted
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Brutalist Technical */}
      <section id="mint" className="py-16 md:py-32 relative z-10 border-y border-border bg-muted/20">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-16">
            <div>
              <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-1 mb-4">
                <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Deployment Tiers</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Product Validation <span className="text-primary">Pricing</span>
              </h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono md:text-right max-w-xs">
              The market doesn't forgive bad strategy.
            </p>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-6 md:items-stretch">
            {/* Tier 1: Observer - Base Tier */}
            <div
              className={`huly-card group order-2 md:order-1 ${selectedTier === 'standard' ? 'huly-active scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
              onClick={() => setSelectedTier('standard')}
            >
              <div className="huly-content">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className={`w-5 h-5 ${selectedTier === 'standard' ? 'text-foreground' : 'text-muted-foreground'}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-[0.2em] ${selectedTier === 'standard' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Observer
                    </h3>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold bg-muted border border-border rounded-full text-muted-foreground tracking-wider">
                    QUICK VALIDATION
                  </span>
                </div>

                <h4 className="text-xl font-bold mb-2 ">Validation Check</h4>
                <p className="text-xs text-muted-foreground mb-4">Stop the bleeding. Confirm if your direction is viable before you burn another dollar.</p>

                {/* Agency Value Anchor */}
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground line-through">$1,500 agency value</span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold  text-foreground">${TIER_CONFIGS.standard.priceUsd}</span>
                  <span className="text-muted-foreground ml-2">USD</span>
                </div>

                <ul className="space-y-3 mb-6 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    Problem Statement Analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    Top 3 Validated Opportunities
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    Quick Viability Score (1-10)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    1 Recommended Next Step
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    24-Hour Delivery
                  </li>
                </ul>

                <div className="space-y-3 mt-auto">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAnalysis("standard");
                    }}
                    disabled={!problemStatement.trim() || createSession.isPending}
                    className="w-full btn-secondary"
                    variant={selectedTier === 'standard' ? "default" : "outline"}
                    size="lg"
                  >
                    {createSession.isPending ? "Processing..." : "Get Quick Validation →"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">Perfect for early-stage validation</p>
                </div>
              </div>
            </div>

            {/* Tier 2: Insider (Most Popular) */}
            <div
              className={`huly-card group order-1 md:order-2 ${selectedTier === 'medium' ? 'huly-active scale-[1.03] z-10' : 'opacity-80 hover:opacity-100'}`}
              onClick={() => setSelectedTier('medium')}
            >
              <div className="huly-content">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className={`w-5 h-5 ${selectedTier === 'medium' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className={`text-sm font-bold uppercase tracking-[0.1em] ${selectedTier === 'medium' ? 'text-primary' : 'text-muted-foreground'}`}>Insider</h3>
                  </div>
                  {selectedTier === 'medium' && (
                    <span className="px-3 py-1.5 text-[10px] font-bold bg-primary/30 border-2 border-primary/60 rounded-full text-primary tracking-wider animate-pulse">
                      ⭐ MOST POPULAR
                    </span>
                  )}
                </div>

                <h4 className="text-2xl font-bold mb-2 ">Strategic Roadmap</h4>
                <p className="text-xs text-muted-foreground mb-4">The founder's playbook. From validated idea to execution plan—your entire robust defense against failure.</p>

                {/* Agency Value Anchor */}
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground line-through">$5,000 agency value</span>
                </div>
                <div className="mb-6">
                  <span className="text-6xl font-bold  text-foreground">${TIER_CONFIGS.medium.priceUsd}</span>
                  <span className="text-muted-foreground ml-2">USD</span>
                </div>

                <ul className="space-y-3 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    <span className="font-semibold text-foreground">Everything in Observer, plus:</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Complete Discovery & Market Analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Live Competitor Research (3-5 competitors)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Strategic Design Roadmap
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Week-by-Week Action Plan
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    5 Critical Risk Mitigations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Error Recovery Strategies
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    48-Hour Delivery
                  </li>
                </ul>

                <div className="space-y-3 mt-auto">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAnalysis("medium");
                    }}
                    disabled={!problemStatement.trim() || createSession.isPending}
                    className={`w-full py-6 text-lg transition-all ${selectedTier === 'medium' ? 'btn-primary shadow-lg shadow-primary/25' : 'btn-secondary'}`}
                  >
                    {createSession.isPending ? "Get Strategic Roadmap →" : "Get Strategic Roadmap →"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">Most popular for founders ready to build</p>
                </div>
              </div>
            </div>

            {/* Tier 3: Syndicate - APEX Tier */}
            <div
              className={`huly-card group order-3 ${selectedTier === 'full' ? 'huly-active scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
              onClick={() => setSelectedTier('full')}
            >
              <div className="huly-content">
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Crown className={`w-5 h-5 ${selectedTier === 'full' ? 'text-purple-400' : 'text-muted-foreground'}`} />
                      <h3 className={`text-xs font-bold uppercase tracking-[0.2em] ${selectedTier === 'full' ? 'text-purple-400' : 'text-muted-foreground'}`}>
                        Syndicate
                      </h3>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 tracking-wider">
                      FULL SUITE
                    </span>
                  </div>

                  <h4 className="text-xl font-bold mb-2 ">Comprehensive Spec</h4>
                  <p className="text-xs text-muted-foreground mb-4">The agency killer. Full technical architecture, PRD, and investor-ready assets at 1/10th the cost.</p>

                  <div className="mb-4">
                    <span className="text-sm text-muted-foreground line-through">$15,000 agency value</span>
                    <span className="ml-2 px-2 py-0.5 text-[10px] bg-red-500/10 text-red-400 rounded-full border border-red-500/20">90% SAVINGS</span>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold  text-foreground">${TIER_CONFIGS.full.priceUsd}</span>
                    <span className="text-muted-foreground ml-2">USD</span>
                  </div>

                  <ul className="space-y-3 mb-6 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-semibold text-foreground">Everything in Insider, plus:</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      Detailed Product Requirements (PRD)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      Technical Architecture Diagram
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      User Flow & Database Schema
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      Investor Pitch Deck Outline
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      Go-to-Market Strategy (GTM)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                      Advanced AI Prompt Library
                    </li>
                  </ul>

                  <div className="space-y-3 mt-auto">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartAnalysis("full");
                      }}
                      disabled={!problemStatement.trim() || createSession.isPending}
                      className="w-full btn-shiny bg-purple-600/20 hover:bg-purple-600/30 border-purple-500/50"
                      size="lg"
                    >
                      {createSession.isPending ? "Processing..." : "Get Full Suite →"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">Best for technical build & fundraising</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Statement - Risk Reversal */}
          <div className="text-center mt-12 pt-8 border-t border-border/50">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-muted/30 border border-border/50">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-foreground">No credit card required to see demo</span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-sm text-muted-foreground">Try before you buy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Research-Backed Methodology Section - Architectural/Technical Design */}
      <section className="py-32 relative z-10 border-y border-border bg-card/40 backdrop-blur-sm">
        {/* Technical Grid Background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.07) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left Column: Manifesto */}
            <div className="lg:col-span-5 lg:sticky lg:top-32">
              <div className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-1 mb-8">
                <div className="w-1.5 h-1.5 bg-primary animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Validation Protocol v4.0</span>
              </div>

              <h2 className="text-5xl md:text-6xl font-bold tracking-tighter mb-8 leading-[0.9]">
                BUILT ON<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-foreground/50">GIANTS.</span>
              </h2>

              <div className="space-y-6 text-lg font-light text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-6">
                <p>
                  We don't guess. We engineer outcome certainty using frameworks derived from <span className="text-foreground font-medium">10,000+ usability studies</span>.
                </p>
                <p>
                  Every layout, interaction, and copy decision in our system is citations-backed, ensuring your product isn't just "designed"—it's <span className="text-foreground font-medium">calibrated for market survival</span>.
                </p>
              </div>

              <div className="mt-12 flex gap-8">
                <div className="flex flex-col">
                  <span className="text-4xl font-bold font-mono text-foreground">15yo</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Research Data</span>
                </div>
                <div className="w-px h-12 bg-border" />
                <div className="flex flex-col">
                  <span className="text-4xl font-bold font-mono text-foreground">99%</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Confidence</span>
                </div>
              </div>
            </div>

            {/* Right Column: The Tech Stack of Truth */}
            <div className="lg:col-span-7 border border-border">
              {/* Header Row */}
              <div className="bg-muted/80 p-4 border-b border-border flex justify-between items-center">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Source_ID</span>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">Application_Layer</span>
              </div>

              {/* Row 1: NN/g */}
              <div className="group relative bg-card/40 hover:bg-primary/5 transition-colors duration-500 overflow-hidden">
                <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-bold font-mono mb-2 flex items-center gap-2 text-foreground">
                      <span className="text-primary">01</span> NIELSEN NORMAN
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Usability Heuristics</p>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      The gold standard for interaction design. We apply their 10 Usability Heuristics to every pixel.
                    </p>
                  </div>
                  <div className="h-full border-l border-border pl-8 hidden md:flex flex-col justify-center">
                    <span className="text-xs font-mono text-primary mb-1">IMPACT:</span>
                    <span className="text-2xl font-bold text-foreground">Retention</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Baymard */}
              <div className="group relative bg-card/40 hover:bg-primary/5 transition-colors duration-500 border-t border-border">
                <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-bold font-mono mb-2 flex items-center gap-2 text-foreground">
                      <span className="text-primary">02</span> BAYMARD INST.
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Checkout Optimization</p>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      Based on 110,000+ hours of testing. We use their layout benchmarks to maximize conversion velocity.
                    </p>
                  </div>
                  <div className="h-full border-l border-border pl-8 hidden md:flex flex-col justify-center">
                    <span className="text-xs font-mono text-primary mb-1">IMPACT:</span>
                    <span className="text-2xl font-bold text-foreground">+35% Conv.</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Forrester */}
              <div className="group relative bg-card/40 hover:bg-primary/5 transition-colors duration-500 border-t border-border">
                <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-bold font-mono mb-2 flex items-center gap-2 text-foreground">
                      <span className="text-primary">03</span> FORRESTER
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Economic Modeling</p>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      "Every $1 invested in UX brings $100 in return." We build financial viability into the UX architecture.
                    </p>
                  </div>
                  <div className="h-full border-l border-border pl-8 hidden md:flex flex-col justify-center">
                    <span className="text-xs font-mono text-primary mb-1">IMPACT:</span>
                    <span className="text-2xl font-bold text-foreground">9,900% ROI</span>
                  </div>
                </div>
              </div>

              {/* Row 4: BJ Fogg */}
              <div className="group relative bg-card/40 hover:bg-primary/5 transition-colors duration-500 border-t border-border">
                <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-xl font-bold font-mono mb-2 flex items-center gap-2 text-foreground">
                      <span className="text-primary">04</span> BJ FOGG (STANFORD)
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Behavioral Design</p>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      We utilize the Fogg Behavior Model (B=MAP) to ensure users have the Motivation, Ability, and Prompt to act.
                    </p>
                  </div>
                  <div className="h-full border-l border-border pl-8 hidden md:flex flex-col justify-center">
                    <span className="text-xs font-mono text-primary mb-1">IMPACT:</span>
                    <span className="text-2xl font-bold text-foreground">Engagement</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Equation of Certainty Section (Redesigned Physics) */}
      <section className="py-32 relative z-10 overflow-hidden bg-muted/30">
        <div className="absolute inset-0 bg-[radial-gradient(#80808020_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="mb-16 md:text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 border border-primary/40 bg-background px-3 py-1 mb-6 rounded-sm">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Core Algorithm</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              The <span className="text-primary">Equation</span> of Certainty.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Product success isn't magic. It's a calculable outcome of three variables.
              We've solved for X.
            </p>
          </div>

          {/* Equation Visualization */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8 mb-16">
            {/* Variable: Hypothesis */}
            <div className="group relative">
              <div className="w-24 h-24 md:w-40 md:h-40 bg-card border border-border flex flex-col items-center justify-center rounded-2xl hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md cursor-help z-10 relative">
                <span className="text-4xl md:text-5xl font-mono font-bold text-foreground group-hover:text-primary transition-colors">H</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Hypothesis</span>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 p-3 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <p className="font-bold mb-1">High-Fidelity Input</p>
                Your raw idea, refined into testable assumptions.
              </div>
            </div>

            <span className="text-4xl text-muted-foreground font-light">×</span>

            {/* Variable: Validation */}
            <div className="group relative">
              <div className="w-24 h-24 md:w-40 md:h-40 bg-card border border-border flex flex-col items-center justify-center rounded-2xl hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md cursor-help z-10 relative">
                <span className="text-4xl md:text-5xl font-mono font-bold text-foreground group-hover:text-primary transition-colors">V</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Validation</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 p-3 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <p className="font-bold mb-1">Deep-Tech Analysis</p>
                AI-driven simulations across 50+ market vectors.
              </div>
            </div>

            <span className="text-4xl text-muted-foreground font-light">×</span>

            {/* Variable: Execution */}
            <div className="group relative">
              <div className="w-24 h-24 md:w-40 md:h-40 bg-card border border-border flex flex-col items-center justify-center rounded-2xl hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md cursor-help z-10 relative">
                <span className="text-4xl md:text-5xl font-mono font-bold text-foreground group-hover:text-primary transition-colors">E</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">Execution</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 p-3 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <p className="font-bold mb-1">Precision Roadmap</p>
                Step-by-step implementation plan with zero ambiguity.
              </div>
            </div>

            <span className="text-4xl text-muted-foreground font-light">=</span>

            {/* Variable: Success */}
            <div className="relative">
              <div className="w-24 h-24 md:w-40 md:h-40 bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center rounded-2xl shadow-lg shadow-primary/20 z-10 relative animate-pulse-slow">
                <span className="text-4xl md:text-5xl font-mono font-bold text-primary-foreground">S</span>
                <span className="text-[10px] uppercase tracking-widest text-primary-foreground/80 mt-2">Success</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
            <div className="bg-card p-8 group hover:bg-muted/50 transition-colors">
              <div className="mb-4 text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Reduce Variance</h3>
              <p className="text-sm text-muted-foreground">Eliminate the "luck factor". We replace founder intuition with data-hardened logic.</p>
            </div>
            <div className="bg-card p-8 group hover:bg-muted/50 transition-colors">
              <div className="mb-4 text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" /></svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Target Lock</h3>
              <p className="text-sm text-muted-foreground">Identify your exact ICP (Ideal Customer Profile) before writing a single line of code.</p>
            </div>
            <div className="bg-card p-8 group hover:bg-muted/50 transition-colors">
              <div className="mb-4 text-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Maximize Yield</h3>
              <p className="text-sm text-muted-foreground">Optimize your pricing and feature set for maximum revenue per user (ARPU).</p>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 ">
              Compare All Features
            </h2>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
              Choose the right tier for your needs
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full glass-panel">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Feature</th>
                  <th className="text-center p-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Observer $49</th>
                  <th className="text-center p-4 font-mono text-xs uppercase tracking-wider text-primary bg-primary/5">Insider $99</th>
                  <th className="text-center p-4 font-mono text-xs uppercase tracking-wider text-purple-400">Syndicate $199</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-border/50">
                  <td className="p-4">Problem Analysis</td>
                  <td className="p-4 text-center text-muted-foreground">Basic</td>
                  <td className="p-4 text-center bg-primary/5">Full</td>
                  <td className="p-4 text-center text-purple-400">Full + Research</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Pain Points</td>
                  <td className="p-4 text-center text-muted-foreground">3</td>
                  <td className="p-4 text-center bg-primary/5">5+</td>
                  <td className="p-4 text-center text-purple-400">7+ validated</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Competitor Research</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center bg-primary/5">3-5 live</td>
                  <td className="p-4 text-center text-purple-400">Deep dive</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Strategic Roadmap</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center bg-primary/5">Weekly</td>
                  <td className="p-4 text-center text-purple-400">Weekly + Deps</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Risk Mitigation</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center bg-primary/5">5 risks</td>
                  <td className="p-4 text-center text-purple-400">7+ with Plan B</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Figma Prompts</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center bg-primary/5">—</td>
                  <td className="p-4 text-center text-purple-400">10 screens</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">ROI Calculation</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center bg-primary/5">—</td>
                  <td className="p-4 text-center text-purple-400">Included</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Research Citations</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center bg-primary/5">Key claims</td>
                  <td className="p-4 text-center text-purple-400">Full verification</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="p-4">Delivery</td>
                  <td className="p-4 text-center text-muted-foreground">24h</td>
                  <td className="p-4 text-center bg-primary/5">48h</td>
                  <td className="p-4 text-center text-purple-400">72h Priority</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Agency Value</td>
                  <td className="p-4 text-center text-muted-foreground line-through">$1,500</td>
                  <td className="p-4 text-center bg-primary/5 line-through">$5,000</td>
                  <td className="p-4 text-center text-purple-400 line-through">$15,000+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-24 relative z-10 border-y border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em] mb-2">
              Trusted by innovative teams at
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-80 transition-opacity duration-500">
            {/* Stripe */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-16 h-8" viewBox="0 0 60 25" fill="currentColor">
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.87.73-2.1 2.4h4.19c-.02-1.3-.75-2.4-2.1-2.4zM36.95 5.52c1.42 0 2.13.63 2.6 1.1l.22-1.1h3.5v13.36h-3.5l-.22-1.1c-.47.47-1.18 1.1-2.6 1.1-3.18 0-5.55-2.81-5.55-6.68 0-3.87 2.37-6.68 5.55-6.68zm.92 10.03c1.48 0 2.2-1.23 2.2-3.35 0-2.12-.72-3.35-2.2-3.35-1.48 0-2.2 1.23-2.2 3.35 0 2.12.72 3.35 2.2 3.35zM25.97 0v18.88h-4.04V0h4.04zm-6.53 18.88L15.42 5.52h4.2l2.5 9.54 2.5-9.54h4.2l-4.02 13.36h-5.36zM4.47 8.87c0-.8.66-1.1 1.73-1.1.97 0 2.19.3 3.16.82V5.1A8.28 8.28 0 0 0 6.2 4.5c-2.81 0-4.68 1.47-4.68 3.92 0 3.83 5.27 3.22 5.27 4.87 0 .95-.83 1.25-1.99 1.25-1.22 0-2.78-.5-4.01-1.18v3.52c1.36.58 2.74.83 4.01.83 2.88 0 4.86-1.43 4.86-3.91 0-4.13-5.3-3.4-5.3-4.93h.11z" />
              </svg>
            </div>

            {/* Vercel */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-20 h-6" viewBox="0 0 283 64" fill="currentColor">
                <path d="M141.04 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM248.72 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM200.24 34c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9V5h9zM36.95 0L73.9 64H0L36.95 0zm92.38 5l-27.71 48L73.91 5H84.3l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9V17h9v9.2c0-5.08 5.91-9.2 13.2-9.2z" />
              </svg>
            </div>

            {/* Notion */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-24 h-6" viewBox="0 0 120 30" fill="currentColor">
                <path d="M2.61 3.75c1.35 1.08 1.85 1 4.39.83l23.9-1.44c.51 0 .09-.5-.08-.58l-3.97-2.86c-.76-.58-1.77-1.25-3.71-1.08L.75 0c-.84.08-.93.5-.51.83l2.37 2.92zm1.43 5.58v25.17c0 1.33.67 1.83 2.19 1.75l26.28-1.5c1.52-.08 1.69-.92 1.69-2v-24.5c0-1.08-.42-1.67-1.35-1.58l-27.46 1.66c-1.02.09-1.35.59-1.35 1zm25.95 1.17c.17.75 0 1.5-.76 1.58l-1.27.25v18.5c-1.1.58-2.11.92-2.95.92-1.35 0-1.69-.42-2.7-1.67l-8.27-13v12.58l2.62.59s0 1.5-2.11 1.5l-5.81.33c-.17-.33 0-1.17.59-1.33l1.52-.42V13.83l-2.11-.17c-.17-.75.25-1.83 1.43-1.91l6.23-.42 8.6 13.17V12.67l-2.2-.25c-.17-.92.5-1.58 1.35-1.67l5.82-.25zM79.95 1.67l-24.24 1.5c-2.54.17-3.38.08-4.73-1l-2.37-2.92c-.42-.33-.33-.75.51-.83l22.39-1.42c1.94-.17 2.95.5 3.71 1.08l3.97 2.86c.17.08.59.58.08.58l.68.15zm-25.69 6.58v24.5c0 1.08.33 1.92 1.35 2l27.46-1.66c.93-.09 1.35-.5 1.35-1.58v-24.5c0-1.07-.33-1.67-1.35-1.58l-27.46 1.66c-.93.08-1.35.5-1.35 1.16zm25.95 1.17c.17.75 0 1.5-.76 1.58l-1.27.25v18.5c-1.1.58-2.11.92-2.95.92-1.35 0-1.69-.42-2.7-1.67l-8.27-13v12.58l2.62.59s0 1.5-2.11 1.5l-5.81.33c-.17-.33 0-1.17.59-1.33l1.52-.42V13.83l-2.11-.17c-.17-.75.25-1.83 1.43-1.91l6.23-.42 8.6 13.17V12.67l-2.2-.25c-.17-.92.5-1.58 1.35-1.67l5.82-.25z" />
              </svg>
            </div>

            {/* Linear */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-20 h-6" viewBox="0 0 100 30" fill="currentColor">
                <path d="M0 15C0 6.72 6.72 0 15 0c8.28 0 15 6.72 15 15 0 8.28-6.72 15-15 15C6.72 30 0 23.28 0 15zm15-12c-6.63 0-12 5.37-12 12 0 2.34.67 4.52 1.83 6.37L18.37 7.83A11.94 11.94 0 0015 3zm0 24c6.63 0 12-5.37 12-12 0-2.34-.67-4.52-1.83-6.37L11.63 22.17c1.85 1.16 4.03 1.83 6.37 1.83z" />
                <path d="M40 6h4v18h10v4H40V6zm20 0h4v22h-4V6zm12 0h4v22h-4V6zm8 0h14v4H84v5h8v4h-8v5h10v4H80V6zm20 0h4l6 14 6-14h4l-8 22h-4l-8-22z" />
              </svg>
            </div>

            {/* Figma */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-16 h-6" viewBox="0 0 38 57" fill="currentColor">
                <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
                <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
                <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
                <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
                <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
              </svg>
            </div>

            {/* Supabase */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-24 h-6" viewBox="0 0 109 30" fill="currentColor">
                <path d="M17.29 27.96c-.72.93-2.18.42-2.18-.76V16.5H1.33c-1.2 0-1.83-1.42-1.03-2.32L14.71 2.04c.72-.93 2.18-.42 2.18.76V13.5h13.78c1.2 0 1.83 1.42 1.03 2.32L17.29 27.96z" />
                <path d="M40 22.5c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm0-11c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm15 11V8.5h3v14h-3zm-1.5-17.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM62 22.5V8.5h3v1.5c1-1.17 2.42-2 4.5-2 3.59 0 6.5 2.91 6.5 6.5v8h-3v-8c0-1.93-1.57-3.5-3.5-3.5S66 13.07 66 15v7.5h-4zm22 0V8.5h3v1.5c1-1.17 2.42-2 4.5-2 3.59 0 6.5 2.91 6.5 6.5v8h-3v-8c0-1.93-1.57-3.5-3.5-3.5S87 13.07 87 15v7.5h-3z" />
              </svg>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              Join <strong className="text-foreground">500+</strong> teams who validated their ideas with ValidateStrategy
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials - Signal Intercepts (Brutalist Technical) */}
      <section className="py-32 relative z-10 border-y border-border">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-16">
            <div>
              <div className="inline-flex items-center gap-2 border border-green-500/40 bg-green-500/5 px-3 py-1 mb-4">
                <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-green-400">Live Signal Feed</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Intercepted <span className="text-primary">Signals</span>
              </h2>
            </div>
            <p className="text-muted-foreground text-sm font-mono md:text-right max-w-xs">
              // What happens when you stop guessing
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
            {/* Transmission 1 - Terminal Style */}
            <div className="bg-card p-6 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="font-mono text-[10px] text-green-400 bg-green-500/10 px-2 py-1 border border-green-500/30">
                  SIGNAL_0x7F3A
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">01.02.2026 :: 03:42 UTC</div>
              </div>
              <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                <span className="text-green-400">&gt;</span> Skeptical at first. Another AI tool, right? But the market analysis caught a competitor pivot we completely missed. <span className="text-green-400 font-medium">Saved us 3 months</span> of building the wrong thing.
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/30 flex items-center justify-center font-bold text-green-400 font-mono text-sm">MK</div>
                <div>
                  <div className="font-medium text-sm">Marcus K.</div>
                  <div className="text-xs text-muted-foreground font-mono">CTO @ Stealth Fintech</div>
                </div>
                <div className="ml-auto">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>

            {/* Transmission 2 */}
            <div className="bg-card p-6 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-1 border border-indigo-500/30">
                  SIGNAL_0x9B2C
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">12.28.2025 :: 14:17 UTC</div>
              </div>
              <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                <span className="text-indigo-400">&gt;</span> Used the Syndicate tier for our Series A pitch deck research. The competitive landscape section was <span className="text-indigo-400 font-medium">more thorough than our $15k consultant</span>. Not even joking.
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 font-mono text-sm">SL</div>
                <div>
                  <div className="font-medium text-sm">Sarah L.</div>
                  <div className="text-xs text-muted-foreground font-mono">Founder @ [REDACTED]</div>
                </div>
                <div className="ml-auto">
                  <CheckCircle className="w-4 h-4 text-indigo-500" />
                </div>
              </div>
            </div>

            {/* Transmission 3 */}
            <div className="bg-card p-6 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 border border-amber-500/30">
                  SIGNAL_0x4E8D
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">12.22.2025 :: 09:33 UTC</div>
              </div>
              <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                <span className="text-amber-400">&gt;</span> Warning: this thing is addictive. Started with one analysis, now I run every new feature idea through it. <span className="text-amber-400 font-medium">The ROI projections are scary accurate</span>.
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 font-mono text-sm">JT</div>
                <div>
                  <div className="font-medium text-sm">James T.</div>
                  <div className="text-xs text-muted-foreground font-mono">Product Lead @ Scale-up</div>
                </div>
                <div className="ml-auto">
                  <CheckCircle className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Transmission 4 */}
            <div className="bg-card p-6 group hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-2 py-1 border border-purple-500/30">
                  SIGNAL_0xA1F7
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">12.18.2025 :: 22:08 UTC</div>
              </div>
              <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                <span className="text-purple-400">&gt;</span> Finally, an AI that doesn't just regurgitate generic advice. The technical feasibility report <span className="text-purple-400 font-medium">identified 3 critical blockers</span> our dev team hadn't considered. Worth every cent.
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 font-mono text-sm">AN</div>
                <div>
                  <div className="font-medium text-sm">Alex N.</div>
                  <div className="text-xs text-muted-foreground font-mono">Engineering Director</div>
                </div>
                <div className="ml-auto">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="mt-12 flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 border border-border bg-card">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground font-mono">
                All transmissions verified via <strong className="text-foreground">blockchain signature</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 relative z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Knowledge Base</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 ">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about the protocol.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-item group">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${expandedFaq === index
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-muted/50 text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-400'
                      }`}>
                      <span className="font-mono text-xs font-bold">0{index + 1}</span>
                    </div>
                    <span className="font-medium">{faq.question}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expandedFaq === index
                    ? 'bg-indigo-500/20 rotate-180'
                    : 'bg-transparent group-hover:bg-muted/50'
                    }`}>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-5 pt-0">
                    <div className="pl-11 text-muted-foreground text-sm leading-relaxed border-l-2 border-indigo-500/30 ml-[3px]">
                      <p className="pl-4">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">Still have questions?</p>
            <a
              href="mailto:contact@validatestrategy.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 relative z-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight font-mono">ValidateStrategy</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition">
                Terms of Service
              </a>
              <a href="/privacy" className="hover:text-foreground transition">
                Privacy Policy
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              © 2026 ValidateStrategy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
