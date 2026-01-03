import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Zap, 
  Globe,
  Mail,
  ArrowRight,
  Sparkles,
  Target,
  Layers,
  Lightbulb,
  AlertTriangle
} from "lucide-react";
import confetti from "canvas-confetti";

const TIER_INFO: Record<string, { name: string; color: string; bgColor: string; borderColor: string; isApex?: boolean }> = {
  standard: { name: "Observer", color: "text-blue-400", bgColor: "bg-blue-500/20", borderColor: "border-blue-500/30" },
  medium: { name: "Insider", color: "text-purple-400", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30" },
  full: { name: "Syndicate", color: "text-amber-400", bgColor: "bg-amber-500/20", borderColor: "border-amber-500/30", isApex: true },
};

const PART_CONFIG = [
  { number: 1, name: "Discovery & Problem Analysis", icon: Target, color: "text-blue-400" },
  { number: 2, name: "Strategic Design & Roadmap", icon: Layers, color: "text-purple-400" },
  { number: 3, name: "AI Toolkit & Figma Prompts", icon: Lightbulb, color: "text-yellow-400" },
  { number: 4, name: "Risk, Metrics & Rationale", icon: AlertTriangle, color: "text-red-400" },
];

type ProgressStatus = "pending" | "in_progress" | "completed" | "failed";

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Completing...";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

export default function PaymentSuccess() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const { data: session } = trpc.session.get.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId, refetchInterval: 2000 }
  );

  const { data: result } = trpc.analysis.getResult.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId && session?.status !== "pending_payment", refetchInterval: session?.status === "processing" ? 2000 : false }
  );

  const tierInfo = session ? TIER_INFO[session.tier as keyof typeof TIER_INFO] : null;
  const isMultiPart = session?.tier === "full";

  // Extract progress status from result (6 parts for Syndicate tier)
  const part1Status = (result?.part1Status as ProgressStatus) || "pending";
  const part2Status = (result?.part2Status as ProgressStatus) || "pending";
  const part3Status = (result?.part3Status as ProgressStatus) || "pending";
  const part4Status = (result?.part4Status as ProgressStatus) || "pending";
  const part5Status = (result?.part5Status as ProgressStatus) || "pending";
  const part6Status = (result?.part6Status as ProgressStatus) || "pending";
  const estimatedCompletionAt = result?.estimatedCompletionAt;

  // Calculate progress (6 parts for Syndicate)
  const completedParts = [part1Status, part2Status, part3Status, part4Status, part5Status, part6Status].filter(s => s === "completed").length;
  const progressPercent = isMultiPart ? (completedParts / 6) * 100 : (result?.singleResult ? 100 : 0);

  // Show confetti on mount
  useEffect(() => {
    if (!hasShownConfetti) {
      setHasShownConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
      });
    }
  }, [hasShownConfetti]);

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

  const getPartStatus = (partNum: number): ProgressStatus => {
    switch (partNum) {
      case 1: return part1Status;
      case 2: return part2Status;
      case 3: return part3Status;
      case 4: return part4Status;
      case 5: return part5Status;
      case 6: return part6Status;
      default: return "pending";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative container max-w-2xl mx-auto px-4 py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your analysis is being prepared.
          </p>
        </div>

        {/* Order Summary Card */}
        <Card className="glass-panel border-emerald-500/30 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Package</span>
              {tierInfo && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.bgColor} ${tierInfo.borderColor} border ${tierInfo.color}`}>
                  {tierInfo.name}
                  {tierInfo.isApex && " • APEX"}
                </span>
              )}
            </div>
            
            <div className="border-t border-border/50 pt-4">
              <p className="text-sm text-muted-foreground mb-2">Problem Statement</p>
              <p className="text-sm">{session?.problemStatement || "Loading..."}</p>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Progress Card */}
        <Card className="glass-panel border-cyan-500/30 mb-6 overflow-hidden">
          <CardContent className="pt-6 relative">
            {/* Animated grid background */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />
            </div>

            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                      {session?.status === "completed" ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <Zap className="h-6 w-6 text-cyan-400" />
                      )}
                    </div>
                    {session?.status === "processing" && (
                      <>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-500 animate-ping" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-500" />
                      </>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">
                      {session?.status === "completed" ? "Analysis Complete!" : "Analysis in Progress"}
                    </h3>
                    {isMultiPart && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3 text-cyan-400" />
                        <span>Perplexity sonar-pro • Real-time research</span>
                      </div>
                    )}
                  </div>
                </div>

                {session?.status === "processing" && timeRemaining !== null && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <Clock className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-mono text-cyan-400">
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono text-cyan-400">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Multi-part Progress (for APEX tier) */}
              {isMultiPart && (
                <div className="grid grid-cols-2 gap-3">
                  {PART_CONFIG.map((part) => {
                    const status = getPartStatus(part.number);
                    const Icon = part.icon;
                    
                    return (
                      <div
                        key={part.number}
                        className={`p-3 rounded-lg border transition-all ${
                          status === "completed"
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : status === "in_progress"
                            ? "bg-cyan-500/10 border-cyan-500/30"
                            : "bg-muted/30 border-border/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${status === "completed" ? "text-emerald-400" : status === "in_progress" ? "text-cyan-400" : "text-muted-foreground"}`} />
                          <span className="text-xs font-medium">Part {part.number}</span>
                          {status === "in_progress" && (
                            <Loader2 className="h-3 w-3 animate-spin text-cyan-400 ml-auto" />
                          )}
                          {status === "completed" && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{part.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Notification */}
        <Card className="glass-panel border-purple-500/30 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Email Notification</h4>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email with a magic link to access your analysis once it's ready. 
                  No need to stay on this page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {session?.status === "completed" ? (
            <Button 
              className="flex-1 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500"
              onClick={() => navigate(`/analysis/${sessionId}`)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              View Full Analysis
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              className="flex-1"
              onClick={() => navigate(`/analysis/${sessionId}`)}
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              View Progress Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
