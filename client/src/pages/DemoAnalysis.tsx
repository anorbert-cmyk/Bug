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
  Plus,
  Globe
} from "lucide-react";
import { NewAnalysisModal } from "@/components/NewAnalysisModal";
import { useRecaptcha } from "@/hooks/useRecaptcha";

// Part configuration with colors and icons (6 parts for Syndicate tier)
const PART_CONFIG = [
  { number: 1, name: "Discovery & Problem Analysis", icon: Target, color: "text-blue-500", bgColor: "bg-blue-500", gradient: "from-blue-500/20 to-cyan-500/20", borderColor: "border-blue-500/30", description: "Deep dive into the problem space and user needs" },
  { number: 2, name: "Competitor Deep-Dive", icon: Layers, color: "text-cyan-500", bgColor: "bg-cyan-500", gradient: "from-cyan-500/20 to-teal-500/20", borderColor: "border-cyan-500/30", description: "Intensive competitive research with real-time data" },
  { number: 3, name: "Strategic Roadmap", icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500", gradient: "from-purple-500/20 to-pink-500/20", borderColor: "border-purple-500/30", description: "Phase-by-phase implementation roadmap" },
  { number: 4, name: "5 Core Design Prompts", icon: Palette, color: "text-yellow-500", bgColor: "bg-yellow-500", gradient: "from-yellow-500/20 to-orange-500/20", borderColor: "border-yellow-500/30", description: "Production-ready prompts for core screens" },
  { number: 5, name: "5 Advanced Design Prompts", icon: Lightbulb, color: "text-green-500", bgColor: "bg-green-500", gradient: "from-green-500/20 to-emerald-500/20", borderColor: "border-green-500/30", description: "Edge cases, error states, and mobile adaptations" },
  { number: 6, name: "Risk, Metrics & ROI", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500", gradient: "from-red-500/20 to-rose-500/20", borderColor: "border-red-500/30", description: "Risk assessment, success metrics, and ROI justification" },
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 w-full justify-between text-xs"
            >
              <span>{isExpanded ? "Hide prompt" : "View prompt"}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
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
  isSubmitting,
  showVerificationMessage = false
}: { 
  isOpen: boolean; 
  onSubmit: (email: string) => void;
  isSubmitting: boolean;
  showVerificationMessage?: boolean;
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
  
  // Show verification sent message
  if (showVerificationMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl blur-lg opacity-30 animate-pulse" />
          
          <Card className="relative bg-background/95 backdrop-blur border-green-500/30">
            <CardContent className="pt-8 pb-6 px-6">
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 animate-ping" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-green-400">Check Your Email</h2>
                  <p className="text-muted-foreground mt-2">
                    We've sent a verification link to your email. Click the link to unlock the full demo.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-sm text-green-300">
                    <CheckCircle2 className="h-4 w-4 inline mr-2" />
                    The link expires in 24 hours
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

// Parse JSON safely
function safeParseJSON(str: string | null | undefined): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// Extract Figma prompts from Part 3 content
function extractFigmaPrompts(part3Content: string): Array<{number: number; title: string; description: string; prompt: string; screen: string}> {
  const prompts: Array<{number: number; title: string; description: string; prompt: string; screen: string}> = [];
  
  // Try to parse as JSON first
  const parsed = safeParseJSON(part3Content);
  if (parsed?.figmaPrompts && Array.isArray(parsed.figmaPrompts)) {
    return parsed.figmaPrompts.map((p: any, i: number) => ({
      number: i + 1,
      title: p.title || `Prompt ${i + 1}`,
      description: p.description || "",
      prompt: p.prompt || p.content || "",
      screen: p.screen || p.category || "UI Design"
    }));
  }
  
  // Fallback: extract from markdown
  const promptRegex = /###?\s*(?:Prompt\s*)?(\d+)[:\s]*([^\n]+)\n([\s\S]*?)(?=###?\s*(?:Prompt\s*)?\d+|$)/gi;
  let match;
  while ((match = promptRegex.exec(part3Content)) !== null) {
    const [, num, title, content] = match;
    prompts.push({
      number: parseInt(num),
      title: title.trim(),
      description: content.substring(0, 100).trim() + "...",
      prompt: content.trim(),
      screen: "UI Design"
    });
  }
  
  return prompts.length > 0 ? prompts : [];
}

export default function DemoAnalysis() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("part1");
  const [isExporting, setIsExporting] = useState(false);
  const [showNewAnalysisModal, setShowNewAnalysisModal] = useState(false);
  
  // Email gate state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasTriggeredGate, setHasTriggeredGate] = useState(false);

  // Fetch demo analysis from database
  const { data: demoData, isLoading, error } = trpc.demo.getAnalysis.useQuery();
  
  // reCAPTCHA hook
  const { executeRecaptcha, isConfigured: isRecaptchaConfigured } = useRecaptcha();

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

      // Trigger email gate at 5% scroll if not already unlocked
      if (progress >= 5 && !isUnlocked && !hasTriggeredGate) {
        setShowEmailGate(true);
        setHasTriggeredGate(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isUnlocked, hasTriggeredGate]);

  // State for verification message
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  // Check if email is already verified on mount
  useEffect(() => {
    const emailVerified = localStorage.getItem("demo_analysis_email_verified");
    if (emailVerified === "true") {
      setIsUnlocked(true);
    }
  }, []);

  // Trigger email gate after 3 seconds if not unlocked (fallback for scroll issues)
  useEffect(() => {
    const unlocked = localStorage.getItem("demo_analysis_unlocked");
    const verified = localStorage.getItem("demo_analysis_email_verified");
    if (unlocked === "true" || verified === "true") return;
    
    const timer = setTimeout(() => {
      if (!isUnlocked && !hasTriggeredGate) {
        setShowEmailGate(true);
        setHasTriggeredGate(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isUnlocked, hasTriggeredGate]);

  // tRPC mutation for saving email (now with double opt-in)
  const subscribeEmail = trpc.emailSubscriber.subscribe.useMutation({
    onSuccess: (data) => {
      if (data.isVerified) {
        // Email already verified - unlock immediately
        setIsUnlocked(true);
        setShowEmailGate(false);
        localStorage.setItem("demo_analysis_unlocked", "true");
        localStorage.setItem("demo_analysis_email_verified", "true");
        toast.success("Welcome back! Demo unlocked.");
      } else if (data.needsVerification) {
        // Show verification sent message
        setShowVerificationMessage(true);
        toast.success("Verification email sent! Check your inbox.");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to subscribe. Please try again.");
    },
  });

  const handleEmailSubmit = async (email: string) => {
    // Get reCAPTCHA token if configured
    let recaptchaToken: string | null = null;
    if (isRecaptchaConfigured) {
      recaptchaToken = await executeRecaptcha("email_subscribe");
    }
    
    subscribeEmail.mutate({ 
      email, 
      source: "demo_analysis_gate",
      recaptchaToken: recaptchaToken || undefined
    });
  };

  // Parse content from database (6 parts for Syndicate tier)
  const part1Raw = demoData?.part1 || "";
  const part2Raw = demoData?.part2 || "";
  const part3Raw = demoData?.part3 || "";
  const part4Raw = demoData?.part4 || "";
  const part5Raw = demoData?.part5 || "";
  const part6Raw = demoData?.part6 || "";
  
  // Try to parse as JSON, fallback to raw string
  const part1 = safeParseJSON(part1Raw)?.content || part1Raw;
  const part2 = safeParseJSON(part2Raw)?.content || part2Raw;
  const part3 = safeParseJSON(part3Raw)?.content || part3Raw;
  const part4 = safeParseJSON(part4Raw)?.content || part4Raw;
  const part5 = safeParseJSON(part5Raw)?.content || part5Raw;
  const part6 = safeParseJSON(part6Raw)?.content || part6Raw;
  
  // Overview comes from fullMarkdown or is constructed from parts
  const overview = demoData?.fullMarkdown || "";
  const problemStatement = demoData?.problemStatement || "Demo analysis";
  
  // Extract Figma prompts from Part 4 and Part 5 (design prompts)
  const figmaPrompts = extractFigmaPrompts((demoData?.part4 || "") + "\n" + (demoData?.part5 || ""));

  // Combine all parts for Overview if overview is empty
  const fullOverview = overview || `${part1}\n\n---\n\n${part2}\n\n---\n\n${part3}\n\n---\n\n${part4}\n\n---\n\n${part5}\n\n---\n\n${part6}`;

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!isUnlocked) {
      setShowEmailGate(true);
      return;
    }
    
    setIsExporting(true);
    try {
      let markdown = `# APEX Strategic Analysis Demo\n\n`;
      markdown += `**Problem Statement:**\n${problemStatement}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Overview\n${overview}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 1: Discovery & Problem Analysis\n${part1}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 2: Competitor Deep-Dive\n${part2}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 3: Strategic Roadmap\n${part3}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 4: 5 Core Design Prompts\n${part4}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 5: 5 Advanced Design Prompts\n${part5}\n\n`;
      markdown += `---\n\n`;
      markdown += `## Part 6: Risk, Metrics & ROI\n${part6}\n\n`;
      
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
  }, [isUnlocked, problemStatement, overview, part1, part2, part3, part4, part5, part6]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading demo analysis...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <p className="text-muted-foreground">Failed to load demo analysis</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Email Gate Modal */}
      <EmailGateModal 
        isOpen={showEmailGate || showVerificationMessage} 
        onSubmit={handleEmailSubmit}
        isSubmitting={subscribeEmail.isPending}
        showVerificationMessage={showVerificationMessage}
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
            <p className="text-sm">{problemStatement}</p>
          </CardContent>
        </Card>

        {/* Tier Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full">
            SYNDICATE
          </span>
          <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-cyan-400">
            APEX • State-of-the-Art AI
          </span>
          <span className="text-xs text-muted-foreground">Demo Analysis</span>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 gap-1">
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
                  {isUnlocked && <CopyButton text={part1} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{part1}</Streamdown>
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
                  {isUnlocked && <CopyButton text={part2} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{part2}</Streamdown>
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
                </div>
              </CardHeader>
              <CardContent>
                {/* Figma Prompts Section - Only detailed collapsible cards */}
                <div className="border border-yellow-500/30 rounded-xl overflow-hidden bg-gradient-to-br from-yellow-500/5 via-background to-orange-500/5">
                  <div className="p-6 border-b border-yellow-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                          <Palette className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">10 Production-Ready Design Prompts</h3>
                          <p className="text-sm text-muted-foreground">Copy and paste into any design tool</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-500 rounded-full">
                          High-Fidelity Design
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-6 ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                    <div className="grid gap-4 md:grid-cols-2">
                      {figmaPrompts.map((prompt, index) => (
                        <FigmaPromptCard
                          key={index}
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

          {/* Part 4 Tab - Core Design Prompts */}
          <TabsContent value="part4">
            <Card className={`glass-panel ${PART_CONFIG[3].borderColor} bg-gradient-to-br ${PART_CONFIG[3].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[3].bgColor}/20 flex items-center justify-center`}>
                      <Palette className={`h-5 w-5 ${PART_CONFIG[3].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 4: {PART_CONFIG[3].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[3].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={part4} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{part4}</Streamdown>
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

          {/* Part 5 Tab - Advanced Design Prompts */}
          <TabsContent value="part5">
            <Card className={`glass-panel ${PART_CONFIG[4].borderColor} bg-gradient-to-br ${PART_CONFIG[4].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[4].bgColor}/20 flex items-center justify-center`}>
                      <Lightbulb className={`h-5 w-5 ${PART_CONFIG[4].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 5: {PART_CONFIG[4].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[4].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={part5} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{part5}</Streamdown>
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

          {/* Part 6 Tab - Risk, Metrics & ROI */}
          <TabsContent value="part6">
            <Card className={`glass-panel ${PART_CONFIG[5].borderColor} bg-gradient-to-br ${PART_CONFIG[5].gradient}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg ${PART_CONFIG[5].bgColor}/20 flex items-center justify-center`}>
                      <AlertTriangle className={`h-5 w-5 ${PART_CONFIG[5].color}`} />
                    </div>
                    <div>
                      <span className="block">Part 6: {PART_CONFIG[5].name}</span>
                      <span className="text-sm font-normal text-muted-foreground">{PART_CONFIG[5].description}</span>
                    </div>
                  </CardTitle>
                  {isUnlocked && <CopyButton text={part6} label="Copy All" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`prose prose-invert max-w-none ${!isUnlocked ? 'blur-sm select-none pointer-events-none' : ''}`}>
                  <Streamdown>{part6}</Streamdown>
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

        {/* Export & CTA Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export as Markdown
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Ready to get your own analysis?</span>
            <Button 
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              onClick={() => setShowNewAnalysisModal(true)}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Start Your Analysis
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
