import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Plus,
  Eye,
  Crown,
  Zap,
  ArrowRight,
  Sparkles
} from "lucide-react";

const TIER_INFO = {
  standard: { name: "Observer", color: "text-slate-400", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", icon: Eye, price: "$49" },
  medium: { name: "Insider", color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/30", icon: Zap, price: "$99" },
  full: { name: "Syndicate", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", icon: Crown, price: "$199" },
};

const STATUS_CONFIG = {
  pending_payment: { icon: Clock, label: "Pending Payment", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  processing: { icon: Loader2, label: "Processing", color: "text-blue-500", bgColor: "bg-blue-500/10", animate: true },
  completed: { icon: CheckCircle2, label: "Completed", color: "text-green-500", bgColor: "bg-green-500/10" },
  failed: { icon: AlertCircle, label: "Failed", color: "text-red-500", bgColor: "bg-red-500/10" },
};

export default function MyAnalyses() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isNewAnalysisOpen, setIsNewAnalysisOpen] = useState(false);
  const [newProblemStatement, setNewProblemStatement] = useState("");
  const [selectedTier, setSelectedTier] = useState<"standard" | "medium" | "full">("full");

  const { data: analyses, isLoading } = trpc.session.getMyAnalyses.useQuery();

  const createSession = trpc.session.create.useMutation({
    onSuccess: (data) => {
      setIsNewAnalysisOpen(false);
      setNewProblemStatement("");
      navigate(`/checkout/${data.sessionId}`);
    },
    onError: (error) => {
      toast.error("Failed to create session", { description: error.message });
    },
  });

  const handleNewAnalysis = () => {
    if (!newProblemStatement.trim() || newProblemStatement.length < 10) {
      toast.error("Problem statement must be at least 10 characters");
      return;
    }
    createSession.mutate({ problemStatement: newProblemStatement, tier: selectedTier });
  };

  const completedAnalyses = analyses?.filter(a => a.status === "completed") || [];
  const processingAnalyses = analyses?.filter(a => a.status === "processing") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Analyses</h1>
            <p className="text-muted-foreground mt-1">View and manage your strategic analyses</p>
          </div>
          <Button 
            onClick={() => setIsNewAnalysisOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Analysis
          </Button>
        </div>

        {/* Processing Analyses */}
        {processingAnalyses.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              In Progress
            </h2>
            <div className="grid gap-4">
              {processingAnalyses.map((analysis) => {
                const tierInfo = TIER_INFO[analysis.tier as keyof typeof TIER_INFO];
                const TierIcon = tierInfo?.icon || Eye;
                return (
                  <div 
                    key={analysis.id}
                    className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-all"
                    onClick={() => navigate(`/analysis/${analysis.sessionId}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={`${tierInfo?.bgColor} ${tierInfo?.color} ${tierInfo?.borderColor}`}>
                            <TierIcon className="h-3 w-3 mr-1" />
                            {tierInfo?.name}
                          </Badge>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Processing
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{analysis.problemStatement}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Started {new Date(analysis.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0">
                        View Progress
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Analyses */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Completed Analyses
            {completedAnalyses.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({completedAnalyses.length})</span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : completedAnalyses.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No analyses yet</h3>
              <p className="text-muted-foreground mb-4">Start your first strategic analysis to see results here</p>
              <Button onClick={() => setIsNewAnalysisOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Analysis
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {completedAnalyses.map((analysis) => {
                const tierInfo = TIER_INFO[analysis.tier as keyof typeof TIER_INFO];
                const TierIcon = tierInfo?.icon || Eye;
                return (
                  <div 
                    key={analysis.id}
                    className="p-4 rounded-xl border border-border bg-card/50 cursor-pointer hover:bg-card hover:border-primary/30 transition-all group"
                    onClick={() => navigate(`/analysis/${analysis.sessionId}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={`${tierInfo?.bgColor} ${tierInfo?.color} ${tierInfo?.borderColor}`}>
                            <TierIcon className="h-3 w-3 mr-1" />
                            {tierInfo?.name}
                          </Badge>
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{analysis.problemStatement}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Completed {new Date(analysis.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        View Analysis
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* New Analysis Modal */}
        <Dialog open={isNewAnalysisOpen} onOpenChange={setIsNewAnalysisOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                New Strategic Analysis
              </DialogTitle>
              <DialogDescription>
                Describe your problem or challenge in 2-3 sentences and select your analysis tier.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {/* Problem Statement Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Problem Statement</label>
                <Textarea
                  placeholder="Describe your business challenge, product idea, or strategic question..."
                  value={newProblemStatement}
                  onChange={(e) => setNewProblemStatement(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {newProblemStatement.length}/500 characters
                </p>
              </div>

              {/* Tier Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Tier</label>
                <div className="grid gap-3">
                  {(Object.entries(TIER_INFO) as [keyof typeof TIER_INFO, typeof TIER_INFO[keyof typeof TIER_INFO]][]).map(([key, tier]) => {
                    const TierIcon = tier.icon;
                    const isSelected = selectedTier === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedTier(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected 
                            ? `${tier.borderColor} ${tier.bgColor} ring-2 ring-offset-2 ring-offset-background ring-primary/50` 
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${tier.bgColor} flex items-center justify-center`}>
                              <TierIcon className={`h-4 w-4 ${tier.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tier.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {key === 'standard' && 'Basic analysis'}
                                {key === 'medium' && 'Detailed insights'}
                                {key === 'full' && 'Complete 6-part APEX analysis'}
                              </p>
                            </div>
                          </div>
                          <span className={`font-semibold ${tier.color}`}>{tier.price}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleNewAnalysis}
                disabled={createSession.isPending || newProblemStatement.length < 10}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                {createSession.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
