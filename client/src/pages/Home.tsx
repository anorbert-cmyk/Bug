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
      question: "How does the validation process work?",
      answer:
        "Our state-of-the-art AI system analyzes your problem statement through 4 distinct phases: Discovery & Problem Analysis, Strategic Design & Roadmap, AI Toolkit with Figma Prompts, and Risk Assessment with Success Metrics. Each phase builds on the previous, creating a comprehensive validation report.",
    },
    {
      question: "Is my idea kept private?",
      answer:
        "Absolutely. We use enterprise-grade security and never share your problem statements with third parties. All analysis is processed in isolated environments and results are encrypted end-to-end.",
    },
    {
      question: "What do I get in the final report?",
      answer:
        "Depending on your tier, you receive: Executive Summary, Market Size Analysis, Competitor Matrix, Technical Architecture Recommendations, 10 Production-Ready Figma Prompts, MVP Roadmap, Risk Assessment, and Actionable Next Steps.",
    },
    {
      question: "Can I upgrade my tier later?",
      answer:
        "Each tier runs a completely different AI analysis pipeline optimized for that specific depth level. Higher tiers don't simply add more content—they use different reasoning models, deeper research chains, and specialized prompts that must process your problem statement from scratch. This ensures you get the most accurate and contextually relevant insights for your chosen tier, rather than retrofitted additions to a lighter analysis.",
    },
    {
      question: "What is your refund policy?",
      answer:
        "We provide a comprehensive demo analysis that shows exactly what you'll receive before purchase. This transparency ensures you know precisely what you're getting. Due to the immediate delivery of AI-generated content and the computational resources involved, all sales are final. We encourage you to review the demo thoroughly before purchasing.",
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

      {/* Navigation */}
      <nav className="sticky top-6 z-40 mx-auto max-w-[95%] px-2 sm:px-4">
        <div className="hud-card rounded-full px-3 sm:px-5 py-2 sm:py-2.5 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight font-mono hidden sm:inline">ValidateStrategy</span>
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
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-foreground rounded-full transition-transform duration-300 shadow-lg ${
                    theme === "dark" ? "translate-x-0" : "translate-x-5"
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

      {/* Hero Section */}
      <section className="pt-28 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.95]">
            <span className="text-red-500">70%</span> of digital products fail.
            <br />
            <span className="text-gradient-primary">Don't be one of them.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
            Get enterprise-grade UX strategy in{" "}
            <strong className="text-foreground font-medium">24-72 hours</strong>. Every recommendation backed by research from{" "}
            <strong className="text-foreground font-medium">Nielsen Norman Group, Baymard Institute, and Forrester</strong>.
          </p>

          <div className="flex flex-col gap-4 justify-center items-center">
            <Button
              onClick={() =>
                document.getElementById("protocol")?.scrollIntoView({ behavior: "smooth" })
              }
              className="btn-primary px-8 py-4 text-lg flex items-center gap-3 group"
            >
              Start Analysis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Zero-Knowledge Privacy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-500" />
                <span>Research-Backed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Strategy Wins - Statistics Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-3">
              The Cost of Building Without Strategy
            </h2>
            <p className="text-muted-foreground/70 text-sm">
              Why research-backed validation matters
            </p>
          </div>

          {/* Statistics Grid - Elegant Minimal Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {/* Card 1: Failure Rate */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-black/5 dark:border-white/10 hover:shadow-lg transition-all duration-300">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Failure Rate</p>
              <div className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-2">70<span className="text-2xl">%</span></div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                of products fail due to poor UX
              </p>
            </div>

            {/* Card 2: User Abandonment */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-black/5 dark:border-white/10 hover:shadow-lg transition-all duration-300">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Abandonment</p>
              <div className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-2">88<span className="text-2xl">%</span></div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                won't return after bad UX
              </p>
            </div>

            {/* Card 3: Lost Revenue */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-black/5 dark:border-white/10 hover:shadow-lg transition-all duration-300">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-4">Lost Annually</p>
              <div className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-2"><span className="text-2xl">$</span>2.6<span className="text-2xl">B</span></div>
              <p className="text-sm text-muted-foreground/80 leading-relaxed">
                to poor UX globally
              </p>
            </div>

            {/* Card 4: ROI Potential */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-500/10 dark:to-emerald-500/5 backdrop-blur-sm rounded-2xl p-6 border border-green-200/50 dark:border-green-500/20 hover:shadow-lg transition-all duration-300">
              <p className="text-xs text-green-600/70 dark:text-green-400/70 uppercase tracking-wider mb-4">ROI Potential</p>
              <div className="text-4xl md:text-5xl font-light tracking-tight text-green-600 dark:text-green-400 mb-2"><span className="text-2xl">$</span>100</div>
              <p className="text-sm text-green-700/70 dark:text-green-300/70 leading-relaxed">
                return per $1 invested
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Process Section */}
      <section className="py-32 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4 font-playfair">How It Works</h2>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
              From Payment to Strategic Insights in 3 Steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5">
              <div className="flow-line w-full h-full">
                <div className="flow-beam" />
              </div>
            </div>

            {/* Step 1: Describe Problem */}
            <div className="glass-panel p-8 text-center relative group hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Step 1</div>
              <h3 className="text-xl font-bold mb-3">Describe Your Problem</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Write your <strong className="text-foreground">problem statement in 2-3 sentences</strong>. Be specific about your challenge, target market, or the solution you're exploring.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-2 py-1 bg-accent rounded text-[10px] text-muted-foreground border border-border">2-3 Sentences</span>
                <span className="px-2 py-1 bg-accent rounded text-[10px] text-muted-foreground border border-border">Be Specific</span>
              </div>
            </div>

            {/* Step 2: Secure Payment */}
            <div className="glass-panel p-8 text-center relative group hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full">Step 2</div>
              <h3 className="text-xl font-bold mb-3">Secure Payment</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Choose your analysis tier and complete payment via <strong className="text-foreground">Crypto</strong>. Card payments coming soon. Your transaction is encrypted and secure.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-2 py-1 bg-accent rounded text-[10px] text-muted-foreground border border-border">SSL Encrypted</span>
                <span className="px-2 py-1 bg-accent rounded text-[10px] text-muted-foreground border border-border">Instant</span>
              </div>
            </div>

            {/* Step 3: AI Analysis & Delivery */}
            <div className="glass-panel p-8 text-center relative group hover:border-primary/30 transition-all duration-300">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">Step 3</div>
              <h3 className="text-xl font-bold mb-3">AI Analysis & Delivery</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Our multi-agent AI processes your problem through <strong className="text-foreground">4 phases</strong>. Receive your report via <strong className="text-foreground">email</strong> and dashboard.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-2 py-1 bg-accent rounded text-[10px] text-muted-foreground border border-border">Real-time</span>
                <span className="px-2 py-1 bg-accent rounded text-[10px] text-muted-foreground border border-border">Multi-Agent</span>
              </div>
            </div>
          </div>

          {/* Timeline indicator */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-accent/50 border border-border">
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
            <h2 className="text-4xl font-bold mb-2 font-playfair tracking-tight">
              The Logic Pipeline
            </h2>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
              Transmuting Ambiguity into Strategy
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

      {/* Pricing Section */}
      <section id="mint" className="py-16 md:py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-playfair">
              Choose Your Protocol
            </h2>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em]">
              Select your analysis depth
            </p>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6 md:items-end">
            {/* Tier 1: Observer - Muted/Decoy */}
            <div className="pricing-card pricing-card-muted opacity-90 hover:opacity-100 transition-all duration-300 order-2 md:order-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Observer
                  </h3>
                </div>
                <span className="px-2 py-1 text-[10px] font-bold bg-muted border border-border rounded-full text-muted-foreground tracking-wider">
                  QUICK VALIDATION
                </span>
              </div>

              <h4 className="text-xl font-bold mb-2 font-playfair">Quick Sanity Check</h4>
              <p className="text-xs text-muted-foreground mb-4">Is your idea worth exploring? Get clarity in 24 hours.</p>

              {/* Agency Value Anchor */}
              <div className="mb-4">
                <span className="text-sm text-muted-foreground line-through">$1,500 agency value</span>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold font-playfair text-green-400">${TIER_CONFIGS.standard.priceUsd}</span>
                <span className="text-muted-foreground ml-2">USD</span>
              </div>

              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  Problem Statement Analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  Top 3 User Pain Points
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
                  onClick={() => handleStartAnalysis("standard")}
                  disabled={!problemStatement.trim() || createSession.isPending}
                  className="w-full btn-secondary"
                  variant="outline"
                >
                  Get Sanity Check →
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Perfect for early-stage validation</p>
              </div>
            </div>

            {/* Tier 2: Insider (Highlighted - Most Popular) */}
            <div className="pricing-card-highlight shadow-2xl order-1 md:order-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.1em]">Insider</h3>
                </div>
                <span className="px-3 py-1.5 text-[10px] font-bold bg-primary/30 border-2 border-primary/60 rounded-full text-primary tracking-wider animate-pulse">
                  ⭐ MOST POPULAR
                </span>
              </div>

              <h4 className="text-2xl font-bold mb-2 font-playfair">Your Strategic Roadmap</h4>
              <p className="text-xs text-muted-foreground mb-4">From validated idea to execution plan with research-backed recommendations.</p>

              {/* Agency Value Anchor */}
              <div className="mb-4">
                <span className="text-sm text-muted-foreground line-through">$5,000 agency value</span>
              </div>
              <div className="mb-6">
                <span className="text-6xl font-bold font-playfair text-green-400">${TIER_CONFIGS.medium.priceUsd}</span>
                <span className="text-muted-foreground ml-2">USD</span>
              </div>

              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  Everything in Observer, plus:
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  Full Discovery & Problem Analysis
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
                  Error Path & Recovery Mapping
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  48-Hour Delivery
                </li>
              </ul>

              <div className="space-y-3 mt-auto">
                <Button
                  onClick={() => handleStartAnalysis("medium")}
                  disabled={!problemStatement.trim() || createSession.isPending}
                  className="w-full btn-primary text-lg py-6"
                >
                  Get My Blueprint →
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Ideal for founders ready to build</p>
              </div>
            </div>

            {/* Tier 3: Syndicate - APEX with Premium Glow */}
            <div className="pricing-card relative overflow-hidden border-2 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)] order-3">
              {/* APEX Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/10 pointer-events-none" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
                      Syndicate
                    </h3>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold bg-purple-500/20 border border-purple-500/40 rounded-full text-purple-400 tracking-wider">
                    👑 APEX
                  </span>
                </div>

                <h4 className="text-xl font-bold mb-2 font-playfair text-purple-400">Complete UX Strategy</h4>
                <p className="text-xs text-muted-foreground mb-4">Enterprise-grade 6-part analysis with 10 production-ready design prompts. Every claim verified with research citations.</p>
                
                {/* Research-Backed Badge */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-purple-950/50 dark:bg-purple-950/50 bg-purple-100 rounded-lg border border-purple-500/20 dark:border-purple-500/20 border-purple-300">
                  <span className="text-sm">🔬</span>
                  <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400">Every claim verified with research citations</span>
                </div>

                {/* Agency Value Anchor */}
                <div className="mb-4">
                  <span className="text-sm text-muted-foreground line-through">$15,000+ agency value</span>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold font-playfair text-green-400">${TIER_CONFIGS.full.priceUsd}</span>
                  <span className="text-muted-foreground ml-2">USD</span>
                </div>

                <ul className="space-y-2 mb-5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    Everything in Insider, plus:
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    AI-Enhanced Execution Toolkit
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold">10 Production-Ready Figma Prompts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    Live Competitor Deep Research
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    Full Risk Matrix & Metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    Business OKR Alignment
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    Expected ROI Calculation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                    72-Hour Priority Delivery
                  </li>
                </ul>

                <div className="space-y-3 mt-auto">
                  <Button
                    onClick={() => handleStartAnalysis("full")}
                    disabled={!problemStatement.trim() || createSession.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-500 border-0"
                  >
                    Start APEX Analysis →
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">For teams building production-ready products</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research-Backed Methodology Section */}
      <section className="py-16 relative z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-light tracking-tight mb-2">
              Built on Research
            </h2>
            <p className="text-muted-foreground/60 text-sm">
              Methodology derived from leading UX research
            </p>
          </div>

          {/* Research Sources - Minimal Inline */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm text-muted-foreground/50">
            <span className="hover:text-foreground/70 transition-colors">Nielsen Norman Group</span>
            <span className="hidden sm:inline text-muted-foreground/20">|</span>
            <span className="hover:text-foreground/70 transition-colors">Baymard Institute</span>
            <span className="hidden sm:inline text-muted-foreground/20">|</span>
            <span className="hover:text-foreground/70 transition-colors">Forrester Research</span>
            <span className="hidden sm:inline text-muted-foreground/20">|</span>
            <span className="hover:text-foreground/70 transition-colors">IDEO</span>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-playfair">
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
                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.87.73-2.1 2.4h4.19c-.02-1.3-.75-2.4-2.1-2.4zM36.95 5.52c1.42 0 2.13.63 2.6 1.1l.22-1.1h3.5v13.36h-3.5l-.22-1.1c-.47.47-1.18 1.1-2.6 1.1-3.18 0-5.55-2.81-5.55-6.68 0-3.87 2.37-6.68 5.55-6.68zm.92 10.03c1.48 0 2.2-1.23 2.2-3.35 0-2.12-.72-3.35-2.2-3.35-1.48 0-2.2 1.23-2.2 3.35 0 2.12.72 3.35 2.2 3.35zM25.97 0v18.88h-4.04V0h4.04zm-6.53 18.88L15.42 5.52h4.2l2.5 9.54 2.5-9.54h4.2l-4.02 13.36h-5.36zM4.47 8.87c0-.8.66-1.1 1.73-1.1.97 0 2.19.3 3.16.82V5.1A8.28 8.28 0 0 0 6.2 4.5c-2.81 0-4.68 1.47-4.68 3.92 0 3.83 5.27 3.22 5.27 4.87 0 .95-.83 1.25-1.99 1.25-1.22 0-2.78-.5-4.01-1.18v3.52c1.36.58 2.74.83 4.01.83 2.88 0 4.86-1.43 4.86-3.91 0-4.13-5.3-3.4-5.3-4.93h.11z"/>
              </svg>
            </div>

            {/* Vercel */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-20 h-6" viewBox="0 0 283 64" fill="currentColor">
                <path d="M141.04 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM248.72 16c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zM200.24 34c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9V5h9zM36.95 0L73.9 64H0L36.95 0zm92.38 5l-27.71 48L73.91 5H84.3l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9V17h9v9.2c0-5.08 5.91-9.2 13.2-9.2z"/>
              </svg>
            </div>

            {/* Notion */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-24 h-6" viewBox="0 0 120 30" fill="currentColor">
                <path d="M2.61 3.75c1.35 1.08 1.85 1 4.39.83l23.9-1.44c.51 0 .09-.5-.08-.58l-3.97-2.86c-.76-.58-1.77-1.25-3.71-1.08L.75 0c-.84.08-.93.5-.51.83l2.37 2.92zm1.43 5.58v25.17c0 1.33.67 1.83 2.19 1.75l26.28-1.5c1.52-.08 1.69-.92 1.69-2v-24.5c0-1.08-.42-1.67-1.35-1.58l-27.46 1.66c-1.02.09-1.35.59-1.35 1zm25.95 1.17c.17.75 0 1.5-.76 1.58l-1.27.25v18.5c-1.1.58-2.11.92-2.95.92-1.35 0-1.69-.42-2.7-1.67l-8.27-13v12.58l2.62.59s0 1.5-2.11 1.5l-5.81.33c-.17-.33 0-1.17.59-1.33l1.52-.42V13.83l-2.11-.17c-.17-.75.25-1.83 1.43-1.91l6.23-.42 8.6 13.17V12.67l-2.2-.25c-.17-.92.5-1.58 1.35-1.67l5.82-.25zM79.95 1.67l-24.24 1.5c-2.54.17-3.38.08-4.73-1l-2.37-2.92c-.42-.33-.33-.75.51-.83l22.39-1.42c1.94-.17 2.95.5 3.71 1.08l3.97 2.86c.17.08.59.58.08.58l.68.15zm-25.69 6.58v24.5c0 1.08.33 1.92 1.35 2l27.46-1.66c.93-.09 1.35-.5 1.35-1.58v-24.5c0-1.07-.33-1.67-1.35-1.58l-27.46 1.66c-.93.08-1.35.5-1.35 1.16zm25.95 1.17c.17.75 0 1.5-.76 1.58l-1.27.25v18.5c-1.1.58-2.11.92-2.95.92-1.35 0-1.69-.42-2.7-1.67l-8.27-13v12.58l2.62.59s0 1.5-2.11 1.5l-5.81.33c-.17-.33 0-1.17.59-1.33l1.52-.42V13.83l-2.11-.17c-.17-.75.25-1.83 1.43-1.91l6.23-.42 8.6 13.17V12.67l-2.2-.25c-.17-.92.5-1.58 1.35-1.67l5.82-.25z"/>
              </svg>
            </div>

            {/* Linear */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-20 h-6" viewBox="0 0 100 30" fill="currentColor">
                <path d="M0 15C0 6.72 6.72 0 15 0c8.28 0 15 6.72 15 15 0 8.28-6.72 15-15 15C6.72 30 0 23.28 0 15zm15-12c-6.63 0-12 5.37-12 12 0 2.34.67 4.52 1.83 6.37L18.37 7.83A11.94 11.94 0 0015 3zm0 24c6.63 0 12-5.37 12-12 0-2.34-.67-4.52-1.83-6.37L11.63 22.17c1.85 1.16 4.03 1.83 6.37 1.83z"/>
                <path d="M40 6h4v18h10v4H40V6zm20 0h4v22h-4V6zm12 0h4v22h-4V6zm8 0h14v4H84v5h8v4h-8v5h10v4H80V6zm20 0h4l6 14 6-14h4l-8 22h-4l-8-22z"/>
              </svg>
            </div>

            {/* Figma */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-16 h-6" viewBox="0 0 38 57" fill="currentColor">
                <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/>
                <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z"/>
                <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z"/>
                <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/>
                <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/>
              </svg>
            </div>

            {/* Supabase */}
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-24 h-6" viewBox="0 0 109 30" fill="currentColor">
                <path d="M17.29 27.96c-.72.93-2.18.42-2.18-.76V16.5H1.33c-1.2 0-1.83-1.42-1.03-2.32L14.71 2.04c.72-.93 2.18-.42 2.18.76V13.5h13.78c1.2 0 1.83 1.42 1.03 2.32L17.29 27.96z"/>
                <path d="M40 22.5c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm0-11c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm15 11V8.5h3v14h-3zm-1.5-17.5a2 2 0 1 1 4 0 2 2 0 0 1-4 0zM62 22.5V8.5h3v1.5c1-1.17 2.42-2 4.5-2 3.59 0 6.5 2.91 6.5 6.5v8h-3v-8c0-1.93-1.57-3.5-3.5-3.5S66 13.07 66 15v7.5h-4zm22 0V8.5h3v1.5c1-1.17 2.42-2 4.5-2 3.59 0 6.5 2.91 6.5 6.5v8h-3v-8c0-1.93-1.57-3.5-3.5-3.5S87 13.07 87 15v7.5h-3z"/>
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

      {/* Testimonials - Signal Intercepts */}
      <section className="py-32 relative z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-green-400 uppercase tracking-wider">Live Signal Feed</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 font-playfair">Intercepted Transmissions</h2>
            <p className="text-muted-foreground font-mono text-xs">// Real feedback from operators in the field</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Transmission 1 - Terminal Style */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              <div className="relative glass-panel p-6 border-l-2 border-green-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="font-mono text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded">
                    TRANSMISSION #0x7F3A
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">01.02.2026 :: 03:42 UTC</div>
                </div>
                <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                  <span className="text-green-400">&gt;</span> Skeptical at first. Another AI tool, right? But the market analysis caught a competitor pivot we completely missed. <span className="text-green-400">Saved us 3 months</span> of building the wrong thing.
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center font-bold text-green-400 font-mono">MK</div>
                  <div>
                    <div className="font-medium text-sm">Marcus K.</div>
                    <div className="text-xs text-muted-foreground font-mono">CTO @ Stealth Fintech</div>
                  </div>
                  <div className="ml-auto text-green-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Transmission 2 - Encrypted Style */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              <div className="relative glass-panel p-6 border-l-2 border-indigo-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    TRANSMISSION #0x9B2C
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">12.28.2025 :: 14:17 UTC</div>
                </div>
                <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                  <span className="text-indigo-400">&gt;</span> Used the Syndicate tier for our Series A pitch deck research. The competitive landscape section was <span className="text-indigo-400">more thorough than our $15k consultant</span>. Not even joking.
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 font-mono">SL</div>
                  <div>
                    <div className="font-medium text-sm">Sarah L.</div>
                    <div className="text-xs text-muted-foreground font-mono">Founder @ [REDACTED]</div>
                  </div>
                  <div className="ml-auto text-indigo-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Transmission 3 - Warning Style */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              <div className="relative glass-panel p-6 border-l-2 border-amber-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                    TRANSMISSION #0x4E8D
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">12.22.2025 :: 09:33 UTC</div>
                </div>
                <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                  <span className="text-amber-400">&gt;</span> Warning: this thing is addictive. Started with one analysis, now I run every new feature idea through it. <span className="text-amber-400">The ROI projections are scary accurate</span>.
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 font-mono">JT</div>
                  <div>
                    <div className="font-medium text-sm">James T.</div>
                    <div className="text-xs text-muted-foreground font-mono">Product Lead @ Scale-up</div>
                  </div>
                  <div className="ml-auto text-amber-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Transmission 4 - Critical Style */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
              <div className="relative glass-panel p-6 border-l-2 border-purple-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
                    TRANSMISSION #0xA1F7
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">12.18.2025 :: 22:08 UTC</div>
                </div>
                <div className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
                  <span className="text-purple-400">&gt;</span> Finally, an AI that doesn't just regurgitate generic advice. The technical feasibility report <span className="text-purple-400">identified 3 critical blockers</span> our dev team hadn't considered. Worth every cent.
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 font-mono">AN</div>
                  <div>
                    <div className="font-medium text-sm">Alex N.</div>
                    <div className="text-xs text-muted-foreground font-mono">Engineering Director</div>
                  </div>
                  <div className="ml-auto text-purple-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/50 border border-border text-xs text-muted-foreground font-mono">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              All transmissions verified via blockchain signature
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
            <h2 className="text-4xl font-bold mb-4 font-playfair">Frequently Asked Questions</h2>
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
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      expandedFaq === index 
                        ? 'bg-indigo-500/20 text-indigo-400' 
                        : 'bg-muted/50 text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-400'
                    }`}>
                      <span className="font-mono text-xs font-bold">0{index + 1}</span>
                    </div>
                    <span className="font-medium">{faq.question}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    expandedFaq === index 
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
