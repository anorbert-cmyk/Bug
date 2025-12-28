import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Streamdown } from "streamdown";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Loader2,
  CheckCircle2,
  Lightbulb,
  Target,
  Layers,
  AlertTriangle,
  TrendingUp,
  FileText,
  Clock,
  Zap,
  Globe,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Palette,
  Code,
  LayoutGrid,
  Shield,
  Users,
  Sparkles,
  BookOpen,
  Wrench,
  BarChart3,
  Brain,
  Rocket
} from "lucide-react";

const TIER_INFO = {
  standard: { name: "Observer", badge: "tier-badge-standard", isApex: false },
  medium: { name: "Insider", badge: "tier-badge-medium", isApex: false },
  full: { name: "Syndicate", badge: "tier-badge-full", isApex: true },
};

const PART_CONFIG = [
  { number: 1, name: "Discovery & Problem Analysis", icon: Target, color: "text-blue-500", bgColor: "bg-blue-500", gradient: "from-blue-500/20 to-cyan-500/20", borderColor: "border-blue-500/30", description: "Deep dive into the problem space and user needs" },
  { number: 2, name: "Strategic Design & Roadmap", icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500", gradient: "from-purple-500/20 to-pink-500/20", borderColor: "border-purple-500/30", description: "Design strategy and implementation roadmap" },
  { number: 3, name: "AI Toolkit & Figma Prompts", icon: Lightbulb, color: "text-yellow-500", bgColor: "bg-yellow-500", gradient: "from-yellow-500/20 to-orange-500/20", borderColor: "border-yellow-500/30", description: "Practical tools and 10 production-ready prompts" },
  { number: 4, name: "Risk, Metrics & Rationale", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500", gradient: "from-red-500/20 to-rose-500/20", borderColor: "border-red-500/30", description: "Risk assessment and success metrics" },
];

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
  screen
}: { 
  number: number; 
  title: string; 
  description: string; 
  prompt: string;
  screen: string;
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
          <CopyButton text={prompt} label="Copy Prompt" />
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">{description}</p>
        
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
              View full prompt
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

// Parse Figma prompts from Part 3 content
function parseFigmaPrompts(content: string): Array<{ number: number; title: string; description: string; prompt: string; screen: string }> {
  const prompts: Array<{ number: number; title: string; description: string; prompt: string; screen: string }> = [];
  
  // Match prompts with pattern: ### Prompt N: Title
  const promptRegex = /### Prompt (\d+): ([^\n]+)\n+```([^`]+)```/g;
  let match;
  
  while ((match = promptRegex.exec(content)) !== null) {
    const number = parseInt(match[1]);
    const title = match[2].trim();
    const promptText = match[3].trim();
    
    // Extract screen type from title or content
    const screenMatch = title.match(/\(([^)]+)\)/);
    const screen = screenMatch ? screenMatch[1] : `Screen ${number}`;
    
    prompts.push({
      number,
      title: title.replace(/\([^)]+\)/, '').trim(),
      description: `Production-ready Figma prompt for ${title.toLowerCase()}`,
      prompt: promptText,
      screen
    });
  }
  
  // If no prompts found with regex, create placeholder prompts
  if (prompts.length === 0) {
    const defaultPrompts = [
      { title: "Homepage Hero", screen: "Landing Page", desc: "Path detection with dual CTAs" },
      { title: "Wallet Connect Modal", screen: "Web3 Entry", desc: "Secure wallet connection flow" },
      { title: "Web2 Onboarding Flow", screen: "Email Path", desc: "4-step progressive disclosure" },
      { title: "Web3 Service Showcase", screen: "Service Page", desc: "DeFi community growth" },
      { title: "Error State - Wallet Rejected", screen: "Error Recovery", desc: "Connection failure handling" },
      { title: "Pricing Page", screen: "Conversion", desc: "Tiered pricing with toggle" },
      { title: "Case Study Template", screen: "Social Proof", desc: "On-chain verified results" },
      { title: "Dashboard Overview", screen: "User Portal", desc: "Campaign analytics view" },
      { title: "Mobile Navigation", screen: "Responsive", desc: "Bottom nav for mobile" },
      { title: "Success Confirmation", screen: "Completion", desc: "Post-purchase celebration" },
    ];
    
    defaultPrompts.forEach((p, i) => {
      prompts.push({
        number: i + 1,
        title: p.title,
        description: p.desc,
        prompt: `[Figma prompt for ${p.title} - Full prompt available in analysis]`,
        screen: p.screen
      });
    });
  }
  
  return prompts;
}

// Helper to format time remaining
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Completing...";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `~${minutes}m ${remainingSeconds}s remaining`;
  }
  return `~${remainingSeconds}s remaining`;
}

// Progress status type matching backend
type ProgressStatus = "pending" | "in_progress" | "completed" | "failed";

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

// Parse markdown sections
function parseMarkdownSections(content: string): Array<{ title: string; content: string; level: number }> {
  const sections: Array<{ title: string; content: string; level: number }> = [];
  const lines = content.split('\n');
  let currentSection: { title: string; content: string[]; level: number } | null = null;
  
  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    
    if (h2Match || h3Match) {
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.join('\n').trim(),
          level: currentSection.level
        });
      }
      currentSection = {
        title: h2Match ? h2Match[1] : h3Match![1],
        content: [],
        level: h2Match ? 2 : 3
      };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }
  
  if (currentSection) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.join('\n').trim(),
      level: currentSection.level
    });
  }
  
  return sections;
}

export default function AnalysisResult() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: session } = trpc.session.get.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  const { data: result, isLoading } = trpc.analysis.getResult.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId, refetchInterval: session?.status === "processing" ? 2000 : false }
  );

  const tierInfo = session ? TIER_INFO[session.tier as keyof typeof TIER_INFO] : null;
  const isMultiPart = session?.tier === "full";
  
  // Extract progress status from result
  const part1Status = (result?.part1Status as ProgressStatus) || "pending";
  const part2Status = (result?.part2Status as ProgressStatus) || "pending";
  const part3Status = (result?.part3Status as ProgressStatus) || "pending";
  const part4Status = (result?.part4Status as ProgressStatus) || "pending";
  const currentPart = result?.currentPart || 0;
  const estimatedCompletionAt = result?.estimatedCompletionAt;
  
  // Calculate progress for multi-part analysis
  const completedParts = [part1Status, part2Status, part3Status, part4Status].filter(s => s === "completed").length;
  const progressPercent = isMultiPart ? (completedParts / 4) * 100 : (result?.singleResult ? 100 : 0);

  // Update time remaining countdown
  useEffect(() => {
    if (session?.status !== "processing" || !estimatedCompletionAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const estimated = new Date(estimatedCompletionAt).getTime();
      const remaining = estimated - now;
      setTimeRemaining(remaining > 0 ? remaining : 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.status, estimatedCompletionAt]);

  // Track elapsed time
  useEffect(() => {
    if (session?.status !== "processing") {
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.status]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Get status for a specific part
  const getPartStatus = (partNum: number): ProgressStatus => {
    switch (partNum) {
      case 1: return part1Status;
      case 2: return part2Status;
      case 3: return part3Status;
      case 4: return part4Status;
      default: return "pending";
    }
  };

  // Render Part 3 with Figma Prompts section
  const renderPart3Content = (content: string) => {
    const figmaPrompts = parseFigmaPrompts(content);
    const sections = parseMarkdownSections(content);
    
    // Find the Figma prompts section
    const figmaSection = sections.find(s => 
      s.title.toLowerCase().includes('figma') || 
      s.title.toLowerCase().includes('prompt')
    );
    
    // Get other sections (non-figma)
    const otherSections = sections.filter(s => 
      !s.title.toLowerCase().includes('figma') && 
      !s.title.toLowerCase().includes('prompt')
    );
    
    return (
      <div className="space-y-6">
        {/* AI Toolkit Section */}
        <CollapsibleSection 
          title="AI-Enhanced Execution Toolkit" 
          icon={Wrench}
          defaultOpen={true}
          badge="6 Tools"
          color="text-yellow-500"
        >
          <div className="prose prose-invert max-w-none prose-sm">
            {otherSections.slice(0, 3).map((section, i) => (
              <div key={i} className="mb-4">
                <Streamdown>{`### ${section.title}\n${section.content}`}</Streamdown>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Deliverables Framework */}
        <CollapsibleSection 
          title="Deliverables Framework" 
          icon={FileText}
          defaultOpen={false}
          color="text-yellow-500"
        >
          <div className="prose prose-invert max-w-none prose-sm">
            {otherSections.slice(3).map((section, i) => (
              <div key={i} className="mb-4">
                <Streamdown>{`### ${section.title}\n${section.content}`}</Streamdown>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Figma Prompts Section - Special Treatment */}
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
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-500 rounded-full">
                  High-Fidelity Design
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {figmaPrompts.map((prompt) => (
                <FigmaPromptCard
                  key={prompt.number}
                  number={prompt.number}
                  title={prompt.title}
                  description={prompt.description}
                  prompt={prompt.prompt}
                  screen={prompt.screen}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render part content with collapsible sections
  const renderPartContent = (partNum: number, content: string) => {
    // Special handling for Part 3 (Figma prompts)
    if (partNum === 3) {
      return renderPart3Content(content);
    }
    
    const sections = parseMarkdownSections(content);
    
    if (sections.length === 0) {
      return (
        <div className="prose prose-invert max-w-none">
          <Streamdown>{content}</Streamdown>
        </div>
      );
    }
    
    // Group sections by level
    const h2Sections = sections.filter(s => s.level === 2);
    
    return (
      <div className="space-y-4">
        {h2Sections.map((section, index) => {
          const Icon = SECTION_ICONS[section.title] || FileText;
          const partConfig = PART_CONFIG[partNum - 1];
          
          return (
            <CollapsibleSection
              key={index}
              title={section.title}
              icon={Icon}
              defaultOpen={index === 0}
              color={partConfig?.color}
            >
              <div className="prose prose-invert max-w-none prose-sm">
                <Streamdown>{section.content}</Streamdown>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Analysis Result</h1>
                {tierInfo && (
                  <div className="flex items-center gap-2">
                    <span className={`tier-badge ${tierInfo.badge}`}>
                      {tierInfo.name}
                    </span>
                    {tierInfo.isApex && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-full text-cyan-400">
                        APEX • Perplexity Powered
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {session?.status === "processing" ? "Analysis in progress..." : "Completed"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Problem Statement */}
        <Card className="glass-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Problem Statement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{session?.problemStatement}</p>
          </CardContent>
        </Card>

        {/* Enhanced Progress Indicator (for processing) */}
        {session?.status === "processing" && isMultiPart && (
          <Card className="glass-panel border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-background to-purple-950/20 overflow-hidden">
            <CardContent className="pt-6 relative">
              {/* Animated background grid */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)`,
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              <div className="relative space-y-6">
                {/* Header with status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <Zap className="h-6 w-6 text-cyan-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-500 animate-ping" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">APEX Analysis Running</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3 text-cyan-400" />
                        <span>Perplexity sonar-pro • Real-time web research</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {timeRemaining !== null && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                        <Clock className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-mono text-cyan-400">
                          {formatTimeRemaining(timeRemaining)}
                        </span>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-cyan-400">{completedParts}/4</p>
                      <p className="text-xs text-muted-foreground">Parts Complete</p>
                    </div>
                  </div>
                </div>

                {/* Main progress bar */}
                <div className="space-y-2">
                  <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500 relative overflow-hidden"
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(progressPercent)}% complete</span>
                    <span>Elapsed: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>

                {/* Part progress cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PART_CONFIG.map((part) => {
                    const status = getPartStatus(part.number);
                    const isActive = status === "in_progress";
                    const isComplete = status === "completed";
                    
                    return (
                      <div 
                        key={part.number}
                        className={`p-3 rounded-lg border transition-all duration-300 ${
                          isActive 
                            ? `bg-gradient-to-br ${part.gradient} ${part.borderColor} shadow-lg` 
                            : isComplete 
                              ? 'bg-green-500/10 border-green-500/30' 
                              : 'bg-muted/20 border-border/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : isActive ? (
                            <Loader2 className={`h-4 w-4 ${part.color} animate-spin`} />
                          ) : (
                            <part.icon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={`text-xs font-medium ${isActive ? part.color : isComplete ? 'text-green-500' : 'text-muted-foreground'}`}>
                            Part {part.number}
                          </span>
                          {isActive && (
                            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-cyan-500/20 text-cyan-400 rounded animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{part.name}</p>
                      </div>
                    );
                  })}
                </div>

                {/* System log */}
                <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-xs font-mono text-cyan-400">SYSTEM LOG</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground space-y-1">
                    {completedParts >= 1 && <p><span className="text-green-400">[✓]</span> Part 1: Discovery complete</p>}
                    {completedParts >= 2 && <p><span className="text-green-400">[✓]</span> Part 2: Strategy mapped</p>}
                    {completedParts >= 3 && <p><span className="text-green-400">[✓]</span> Part 3: AI toolkit generated</p>}
                    {completedParts >= 4 && <p><span className="text-green-400">[✓]</span> Part 4: Risk analysis complete</p>}
                    {currentPart > 0 && currentPart <= 4 && getPartStatus(currentPart) === "in_progress" && (
                      <p className="text-cyan-400 animate-pulse">
                        [→] Processing Part {currentPart}: {PART_CONFIG[currentPart - 1]?.name}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simple progress for non-APEX tiers */}
        {session?.status === "processing" && !isMultiPart && (
          <Card className="glass-panel border-primary/30">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-medium">Analysis in Progress</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Processing...</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {isMultiPart ? (
              /* Multi-Part Results (Full Tier) */
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
                      disabled={!result[`part${part.number}` as keyof typeof result]}
                      className="text-xs sm:text-sm py-2"
                    >
                      <part.icon className={`h-4 w-4 mr-1 hidden sm:inline ${part.color}`} />
                      <span className="sm:hidden">P{part.number}</span>
                      <span className="hidden sm:inline">Part {part.number}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview">
                  <Card className="glass-panel">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Full Analysis Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-invert max-w-none">
                      {result.fullMarkdown ? (
                        <Streamdown>{result.fullMarkdown}</Streamdown>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          <p>Compiling full report...</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {PART_CONFIG.map((part) => {
                  const partKey = `part${part.number}` as "part1" | "part2" | "part3" | "part4";
                  const partContent = result[partKey];
                  
                  return (
                    <TabsContent key={part.number} value={`part${part.number}`}>
                      <Card className={`glass-panel ${part.borderColor} bg-gradient-to-br ${part.gradient}`}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <div className={`w-10 h-10 rounded-lg ${part.bgColor}/20 flex items-center justify-center`}>
                                <part.icon className={`h-5 w-5 ${part.color}`} />
                              </div>
                              <div>
                                <span className="block">Part {part.number}: {part.name}</span>
                                <span className="text-sm font-normal text-muted-foreground">{part.description}</span>
                              </div>
                            </CardTitle>
                            {partContent && (
                              <CopyButton text={partContent} label="Copy All" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {partContent ? (
                            renderPartContent(part.number, partContent)
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                              <p>Generating this section...</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              /* Single Result (Standard/Medium Tier) */
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Analysis Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-invert max-w-none">
                  {result.singleResult ? (
                    <Streamdown>{result.singleResult}</Streamdown>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Generating analysis...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upgrade CTA (for non-full tiers) */}
            {session?.tier !== "full" && session?.status === "completed" && (
              <Card className="glass-panel border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Want Deeper Insights?</h3>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to Syndicate for a comprehensive 4-part analysis with 10 Figma prompts
                        </p>
                      </div>
                    </div>
                    <Button 
                      className="bg-purple-500 hover:bg-purple-600"
                      onClick={() => navigate("/")}
                    >
                      Upgrade to Full Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
