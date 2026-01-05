import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  CreditCard,
  Bitcoin,
  Loader2,
  Shield,
  RefreshCw,
  BarChart3,
  PieChart,
  Copy,
  ExternalLink,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  Mail,
  Download,
  AlertTriangle,
  Activity,
  Zap,
  RotateCcw,
  Play,
  Pause,
  Database,
  Timer,
  ListRestart,
  Info,
  HelpCircle
} from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// CSS-based charts - no recharts dependency (CSP compliant)

// Admin wallet address (should match server-side)
const ADMIN_WALLET = "0xa14504ffe5E9A245c9d4079547Fa16fA0A823114".toLowerCase();

// Helper to format wallet address
const formatWallet = (address: string | null | undefined) => {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper to copy to clipboard
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Copied to clipboard");
};

export default function Admin() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "tier">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Check if MetaMask is available
  const hasMetaMask = typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined";
  const isMetaMaskInstalled = hasMetaMask && (window as any).ethereum.isMetaMask;

  const requestChallenge = trpc.admin.requestChallenge.useMutation();
  const verifySignature = trpc.admin.verifySignature.useMutation();

  // Admin auth state for API calls
  const [adminAuth, setAdminAuth] = useState<{ signature: string; timestamp: number; address: string } | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, error: statsError } = trpc.admin.getStats.useQuery(
    adminAuth || { signature: "", timestamp: 0, address: "" },
    { 
      enabled: isAuthenticated && !!adminAuth,
      retry: false,
    }
  );

  // Handle token expiration - auto re-authenticate
  useEffect(() => {
    if (statsError?.message?.includes('expired') || statsError?.message?.includes('Invalid')) {
      toast.error("Session expired", { description: "Please sign in again" });
      setIsAuthenticated(false);
      setAdminAuth(null);
      setAuthToken(null);
    }
  }, [statsError]);

  const { data: transactionsData, isLoading: txLoading, refetch: refetchTx } = trpc.admin.getTransactions.useQuery(
    adminAuth ? { ...adminAuth, limit: 100 } : { signature: "", timestamp: 0, address: "", limit: 100 },
    { enabled: isAuthenticated && !!adminAuth }
  );

  const transactions = transactionsData?.transactions || [];

  // Email subscribers query
  const { data: emailData, isLoading: emailLoading, refetch: refetchEmails } = trpc.admin.getEmailSubscribers.useQuery(
    adminAuth || { signature: "", timestamp: 0, address: "" },
    { enabled: isAuthenticated && !!adminAuth }
  );

  const emailSubscribers = emailData?.subscribers || [];
  const emailStats = emailData?.stats || { total: 0, verified: 0, unverified: 0, verificationRate: 0 };

  // Error dashboard query
  const { data: errorDashboard, isLoading: errorLoading, refetch: refetchErrors } = trpc.admin.getErrorDashboard.useQuery(
    adminAuth || { signature: "", timestamp: 0, address: "" },
    { enabled: isAuthenticated && !!adminAuth, refetchInterval: 30000 } // Auto-refresh every 30s
  );

  // Reset circuit breaker mutation
  const resetCircuitBreaker = trpc.admin.resetCircuitBreaker.useMutation({
    onSuccess: () => {
      toast.success("Circuit breaker reset", { description: "API connections restored" });
      refetchErrors();
    },
    onError: (error) => {
      toast.error("Failed to reset circuit breaker", { description: error.message });
    }
  });

  // Historical metrics time range state
  const [metricsTimeRange, setMetricsTimeRange] = useState<24 | 168 | 720>(24); // 24h, 7d, 30d in hours

  // Historical metrics query
  const { data: historicalMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.admin.getHistoricalMetrics.useQuery(
    adminAuth ? { ...adminAuth, hours: metricsTimeRange } : { signature: "", timestamp: 0, address: "", hours: 24 },
    { enabled: isAuthenticated && !!adminAuth }
  );

  // Retry queue stats query
  const { data: retryQueueStats, isLoading: queueLoading, refetch: refetchQueue } = trpc.admin.getRetryQueueStats.useQuery(
    adminAuth || { signature: "", timestamp: 0, address: "" },
    { enabled: isAuthenticated && !!adminAuth, refetchInterval: 10000 } // Auto-refresh every 10s
  );

  // Error summary query
  const { data: errorSummary, isLoading: errorSummaryLoading } = trpc.admin.getErrorSummary.useQuery(
    adminAuth ? { ...adminAuth, hours: metricsTimeRange } : { signature: "", timestamp: 0, address: "", hours: 24 },
    { enabled: isAuthenticated && !!adminAuth }
  );

  // ============ LOG VIEWER ============
  const [logLevel, setLogLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = trpc.admin.getLogs.useQuery(
    adminAuth ? { ...adminAuth, level: logLevel, limit: 100 } : { signature: "", timestamp: 0, address: "", level: 'all', limit: 100 },
    { enabled: isAuthenticated && !!adminAuth, refetchInterval: 5000 } // Auto-refresh every 5s
  );

  // Toggle retry processor mutation
  const toggleProcessor = trpc.admin.toggleRetryProcessor.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchQueue();
    },
    onError: (error) => {
      toast.error("Failed to toggle processor", { description: error.message });
    }
  });

  // Trigger metrics aggregation mutation
  const triggerAggregation = trpc.admin.triggerMetricsAggregation.useMutation({
    onSuccess: () => {
      toast.success("Metrics aggregation triggered");
      refetchMetrics();
    },
    onError: (error) => {
      toast.error("Failed to trigger aggregation", { description: error.message });
    }
  });

  // ============ ANALYSIS OPERATIONS CENTER ============
  const [operationsFilter, setOperationsFilter] = useState<string | undefined>(undefined);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [operationsPage, setOperationsPage] = useState(0);
  const [operationsPageSize, setOperationsPageSize] = useState(10);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    operationId: 120,
    session: 100,
    tier: 100,
    state: 120,
    progress: 140,
    started: 160,
    actions: 120,
  });

  // Operations summary query
  const { data: operationsSummary, isLoading: summaryLoading, refetch: refetchSummary } = trpc.admin.getOperationsSummary.useQuery(
    adminAuth || { signature: "", timestamp: 0, address: "" },
    { enabled: isAuthenticated && !!adminAuth, refetchInterval: 15000 }
  );

  // Operations list query
  const { data: operationsData, isLoading: operationsLoading, refetch: refetchOperations } = trpc.admin.getAnalysisOperations.useQuery(
    adminAuth ? { ...adminAuth, state: operationsFilter as any, limit: operationsPageSize, offset: operationsPage * operationsPageSize } : { signature: "", timestamp: 0, address: "", limit: operationsPageSize, offset: 0 },
    { enabled: isAuthenticated && !!adminAuth, refetchInterval: 10000 }
  );

  // Retryable operations query
  const { data: retryableOps, isLoading: retryableLoading, refetch: refetchRetryable } = trpc.admin.getRetryableOperations.useQuery(
    adminAuth || { signature: "", timestamp: 0, address: "" },
    { enabled: isAuthenticated && !!adminAuth }
  );

  // Operation details query (when an operation is selected)
  const { data: operationDetails, isLoading: detailsLoading, refetch: refetchDetails } = trpc.admin.getOperationDetails.useQuery(
    adminAuth && selectedOperationId ? { ...adminAuth, operationId: selectedOperationId } : { signature: "", timestamp: 0, address: "", operationId: "" },
    { enabled: isAuthenticated && !!adminAuth && !!selectedOperationId }
  );

  // Pause operation mutation
  const pauseOperationMutation = trpc.admin.pauseOperation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchOperations();
      refetchSummary();
      if (selectedOperationId) refetchDetails();
    },
    onError: (error) => {
      toast.error("Failed to pause operation", { description: error.message });
    }
  });

  // Resume operation mutation
  const resumeOperationMutation = trpc.admin.resumeOperation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchOperations();
      refetchSummary();
      if (selectedOperationId) refetchDetails();
    },
    onError: (error) => {
      toast.error("Failed to resume operation", { description: error.message });
    }
  });

  // Cancel operation mutation
  const cancelOperationMutation = trpc.admin.cancelOperation.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchOperations();
      refetchSummary();
      if (selectedOperationId) refetchDetails();
    },
    onError: (error) => {
      toast.error("Failed to cancel operation", { description: error.message });
    }
  });

  // Trigger regeneration mutation
  const triggerRegenerationMutation = trpc.admin.triggerRegeneration.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, { description: `New operation: ${data.newOperationId?.slice(0, 8)}...` });
      refetchOperations();
      refetchSummary();
      refetchRetryable();
    },
    onError: (error) => {
      toast.error("Failed to trigger regeneration", { description: error.message });
    }
  });

  // Export emails to CSV
  const exportEmailsToCSV = () => {
    const headers = ["Email", "Source", "Verified", "Subscribed At", "Verified At"];
    const rows = emailSubscribers.map(sub => [
      sub.email,
      sub.source,
      sub.isVerified ? "Yes" : "No",
      new Date(sub.subscribedAt).toISOString(),
      sub.verifiedAt ? new Date(sub.verifiedAt).toISOString() : ""
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((tx: any) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tx.sessionId?.toLowerCase().includes(query) ||
        tx.walletAddress?.toLowerCase().includes(query) ||
        tx.tier?.toLowerCase().includes(query) ||
        tx.paymentMethod?.toLowerCase().includes(query)
      );
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "amount":
          comparison = parseFloat(a.amountUsd) - parseFloat(b.amountUsd);
          break;
        case "tier":
          comparison = a.tier.localeCompare(b.tier);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const connectWallet = async () => {
    if (!hasMetaMask) {
      toast.error("MetaMask not found", { description: "Please install MetaMask to continue" });
      return;
    }
    
    // Debug log
    console.log("MetaMask detected:", {
      ethereum: !!(window as any).ethereum,
      isMetaMask: (window as any).ethereum?.isMetaMask,
    });

    setIsConnecting(true);

    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0]?.toLowerCase();

      if (!address) {
        toast.error("No account found");
        return;
      }

      // Check if this is the admin wallet
      if (address !== ADMIN_WALLET) {
        toast.error("Unauthorized wallet", { 
          description: "This wallet is not authorized for admin access" 
        });
        setIsConnecting(false);
        return;
      }

      setWalletAddress(address);

      // Request challenge from server
      const { challenge, timestamp } = await requestChallenge.mutateAsync({ walletAddress: address });

      // Sign the challenge
      const message = `ValidateStrategy Admin Login\n\nChallenge: ${challenge}\nTimestamp: ${timestamp}\n\nSign this message to authenticate.`;
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Verify signature with server
      await verifySignature.mutateAsync({
        walletAddress: address,
        signature,
        challenge,
        timestamp,
      });
      setAuthToken(signature);
      setIsAuthenticated(true);
      
      // Store auth for subsequent API calls
      setAdminAuth({
        signature,
        timestamp,
        address,
      });
      
      toast.success("Admin access granted");

    } catch (error: any) {
      console.error("Wallet connection error:", error);
      if (error.code === 4001) {
        toast.error("Connection rejected", { description: "You rejected the connection request" });
      } else {
        toast.error("Authentication failed", { description: error.message });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (!hasMetaMask) return;

    const ethereum = (window as any).ethereum;
    
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0 || accounts[0]?.toLowerCase() !== ADMIN_WALLET) {
        setIsAuthenticated(false);
        setWalletAddress(null);
        setAuthToken(null);
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [hasMetaMask]);

  // Calculate additional stats
  const totalWalletPurchases = transactions.filter((tx: any) => tx.walletAddress).length;
  const uniqueWallets = new Set(transactions.filter((tx: any) => tx.walletAddress).map((tx: any) => tx.walletAddress.toLowerCase())).size;
  const avgOrderValue = stats?.totalPurchases ? (stats.totalRevenueUsd / stats.totalPurchases) : 0;

  // Not authenticated - show connect screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass-panel">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Admin Access</h1>
            <CardDescription>
              Connect your authorized MetaMask wallet to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasMetaMask ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  MetaMask is required for admin authentication
                </p>
                <Button asChild>
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                    Install MetaMask
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  After installing, refresh this page
                </p>
              </div>
            ) : !isMetaMaskInstalled ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  A Web3 wallet was detected but it doesn't appear to be MetaMask.
                  Please make sure MetaMask is your active wallet.
                </p>
                <Button asChild>
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                    Get MetaMask
                  </a>
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full btn-primary" 
                onClick={connectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect MetaMask
                  </>
                )}
              </Button>
            )}
            
            <p className="text-xs text-center text-muted-foreground">
              Only the authorized admin wallet can access this dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show admin dashboard
  return (
    <div className="admin-container">
      {/* Noise Texture Overlay */}
      <div className="bg-noise" />
      
      {/* Fractal Blob Background - Technical Brutalist */}
      <div className="fractal-container">
        <div className="fractal-blob blob-1" />
        <div className="fractal-blob blob-2" />
        <div className="fractal-blob blob-3" />
      </div>

      {/* Header - Technical Brutalist */}
      <header className="admin-header">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-primary/50 bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-mono font-bold text-sm uppercase tracking-wider">Admin Dashboard</h1>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Live
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-mono text-xs">
              <Wallet className="h-3 w-3 mr-1" />
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => { refetchStats(); refetchTx(); refetchEmails(); }} aria-label="Refresh data">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Stats Cards - Row 1 */}
        <div className="admin-section-title">
          <Zap className="w-3 h-3" />
          Revenue Metrics
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs"><strong>Revenue Metrics</strong> shows your total earnings across all payment methods. Track USD revenue from Stripe/PayPal and crypto revenue from NOWPayments. Use this to monitor business growth and identify your most profitable channels.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="admin-stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue (USD)</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-500">${stats?.totalRevenueUsd?.toFixed(2) || "0.00"}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Crypto Revenue</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-orange-500">{stats?.totalRevenueCrypto?.toFixed(4) || "0"} ETH</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Bitcoin className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalPurchases || 0}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Row 2 (Wallet specific) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-panel border-cyan-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unique Wallets</p>
                  {txLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-cyan-500">{uniqueWallets}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-cyan-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-indigo-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Purchases</p>
                  {txLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-indigo-500">{totalWalletPurchases}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-indigo-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-amber-500">
                      {stats?.conversionFunnel?.sessions 
                        ? ((stats.conversionFunnel.completed / stats.conversionFunnel.sessions) * 100).toFixed(1)
                        : "0"}%
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Distribution */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tier Distribution */}
          <Card className="admin-card">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <PieChart className="h-5 w-5" />
                Tier Distribution
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs"><strong>Tier Distribution</strong> shows how many customers purchased each pricing tier. Observer ($49) is entry-level, Insider ($99) is mid-tier, and Syndicate ($199) is premium. Use this to understand which tier resonates most with your audience and optimize pricing strategy.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </h2>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { tier: "Observer", count: stats?.tierDistribution?.standard || 0, color: "bg-emerald-500", price: "$49" },
                    { tier: "Insider", count: stats?.tierDistribution?.medium || 0, color: "bg-indigo-500", price: "$99" },
                    { tier: "Syndicate", count: stats?.tierDistribution?.full || 0, color: "bg-purple-500", price: "$199" },
                  ].map((item) => {
                    const total = (stats?.tierDistribution?.standard || 0) + 
                                  (stats?.tierDistribution?.medium || 0) + 
                                  (stats?.tierDistribution?.full || 0);
                    const percent = total > 0 ? (item.count / total) * 100 : 0;
                    
                    return (
                      <div key={item.tier} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            {item.tier} <span className="text-muted-foreground">({item.price})</span>
                          </span>
                          <span className="font-medium">{item.count} <span className="text-muted-foreground">({percent.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="admin-card">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <BarChart3 className="h-5 w-5" />
                Payment Methods
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p className="text-xs"><strong>Payment Methods</strong> shows the distribution of payments between Stripe (credit cards) and NOWPayments (cryptocurrency). This helps you understand customer payment preferences and whether to prioritize certain payment integrations.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </h2>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { method: "Stripe (Card)", count: stats?.paymentMethodDistribution?.stripe || 0, icon: CreditCard, color: "bg-blue-500" },
                    { method: "NOWPayments (Crypto)", count: (stats?.paymentMethodDistribution as any)?.nowpayments || 0, icon: Bitcoin, color: "bg-orange-500" },
                  ].map((item) => {
                    const total = (stats?.paymentMethodDistribution?.stripe || 0) + 
                                  ((stats?.paymentMethodDistribution as any)?.nowpayments || 0);
                    const percent = total > 0 ? (item.count / total) * 100 : 0;
                    
                    return (
                      <div key={item.method} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.method}</span>
                          </div>
                          <span className="font-medium">{item.count} <span className="text-muted-foreground">({percent.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card className="admin-card">
          <CardHeader>
            <h2 className="text-lg font-semibold leading-none tracking-tight">Conversion Funnel</h2>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="flex items-center justify-between gap-4">
                {[
                  { label: "Sessions", value: stats?.conversionFunnel?.sessions || 0, icon: Users },
                  { label: "Payments Started", value: stats?.conversionFunnel?.payments || 0, icon: CreditCard },
                  { label: "Completed", value: stats?.conversionFunnel?.completed || 0, icon: CheckCircle },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex-1 text-center relative">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold">{step.value}</div>
                    <div className="text-sm text-muted-foreground">{step.label}</div>
                    {i < arr.length - 1 && (
                      <div className="absolute top-6 right-0 transform translate-x-1/2 text-xs text-muted-foreground">
                        {step.value > 0 
                          ? `${((arr[i + 1].value / step.value) * 100).toFixed(0)}%`
                          : "0%"
                        }
                        <span className="ml-1">→</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Operations Center */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Database className="h-5 w-5" />
                Analysis Operations Center
              </h2>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                  value={operationsFilter || "all"}
                  onChange={(e) => setOperationsFilter(e.target.value === "all" ? undefined : e.target.value)}
                >
                  <option value="all">All States</option>
                  <option value="initialized">Initialized</option>
                  <option value="generating">Generating</option>
                  <option value="part_completed">Part Completed</option>
                  <option value="paused">Paused</option>
                  <option value="failed">Failed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { refetchOperations(); refetchSummary(); }}
                  disabled={operationsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${operationsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Operations Summary Cards */}
            {summaryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : operationsSummary ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400">{operationsSummary.activeOperations}</div>
                  <div className="text-sm text-muted-foreground">Active</div>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">{operationsSummary.completedOperations}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400">{operationsSummary.failedOperations}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">{operationsSummary.successRate}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            ) : null}

            {/* Operations Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation ID</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationsLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : operationsData?.operations?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No operations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    operationsData?.operations?.map((op: any) => (
                      <TableRow key={op.operationId} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOperationId(op.operationId)}>
                        <TableCell className="font-mono text-xs">
                          {op.operationId?.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {op.sessionId?.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant={op.tier === 'full' ? 'default' : op.tier === 'medium' ? 'secondary' : 'outline'}>
                            {op.tierLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            op.state === 'completed' ? 'default' :
                            op.state === 'failed' ? 'destructive' :
                            op.state === 'generating' || op.state === 'part_completed' ? 'secondary' :
                            op.state === 'paused' ? 'outline' : 'outline'
                          } className={
                            op.state === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            op.state === 'generating' || op.state === 'part_completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            ''
                          }>
                            {op.state === 'part_completed' ? `Part ${op.completedParts}/${op.totalParts}` : op.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  op.state === 'completed' ? 'bg-green-500' :
                                  op.state === 'failed' ? 'bg-red-500' :
                                  'bg-blue-500'
                                }`}
                                style={{ width: `${op.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{op.progressPercent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {op.startedAt ? new Date(op.startedAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(op.state === 'generating' || op.state === 'part_completed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (adminAuth) pauseOperationMutation.mutate({ ...adminAuth, operationId: op.operationId });
                                }}
                                disabled={pauseOperationMutation.isPending}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            {op.state === 'paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (adminAuth) resumeOperationMutation.mutate({ ...adminAuth, operationId: op.operationId });
                                }}
                                disabled={resumeOperationMutation.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {op.state === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (adminAuth) triggerRegenerationMutation.mutate({ ...adminAuth, sessionId: op.sessionId });
                                }}
                                disabled={triggerRegenerationMutation.isPending}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {op.state !== 'completed' && op.state !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (adminAuth) cancelOperationMutation.mutate({ ...adminAuth, operationId: op.operationId });
                                }}
                                disabled={cancelOperationMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <select
                  className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                  value={operationsPageSize}
                  onChange={(e) => {
                    setOperationsPageSize(Number(e.target.value));
                    setOperationsPage(0); // Reset to first page
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ml-4">
                  Showing {operationsPage * operationsPageSize + 1}-{Math.min((operationsPage + 1) * operationsPageSize, operationsData?.total || 0)} of {operationsData?.total || 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOperationsPage(0)}
                  disabled={operationsPage === 0}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOperationsPage(p => Math.max(0, p - 1))}
                  disabled={operationsPage === 0}
                >
                  Previous
                </Button>
                <span className="text-sm px-2">
                  Page {operationsPage + 1} of {Math.ceil((operationsData?.total || 0) / operationsPageSize) || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOperationsPage(p => p + 1)}
                  disabled={!operationsData?.hasMore}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOperationsPage(Math.ceil((operationsData?.total || 0) / operationsPageSize) - 1)}
                  disabled={!operationsData?.hasMore}
                >
                  Last
                </Button>
              </div>
            </div>

            {/* Operation Details Panel */}
            {selectedOperationId && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Operation Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOperationId(null)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                {detailsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-40" />
                  </div>
                ) : operationDetails ? (
                  <div className="space-y-4">
                    {/* Operation Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Operation ID</div>
                        <div className="font-mono">{operationDetails.operation.operationId?.slice(0, 12)}...</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Session ID</div>
                        <div className="font-mono">{operationDetails.operation.sessionId?.slice(0, 12)}...</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Tier</div>
                        <div>{operationDetails.operation.tierLabel}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Triggered By</div>
                        <div className="capitalize">{operationDetails.operation.triggeredBy}</div>
                      </div>
                    </div>

                    {/* Progress Visualization */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Progress: {operationDetails.operation.completedParts}/{operationDetails.operation.totalParts} parts</div>
                      <div className="flex gap-1">
                        {[...Array(operationDetails.operation.totalParts)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-8 flex-1 rounded ${
                              i < operationDetails.operation.completedParts
                                ? 'bg-green-500'
                                : i === operationDetails.operation.currentPart - 1
                                ? operationDetails.operation.state === 'failed'
                                  ? 'bg-red-500 animate-pulse'
                                  : 'bg-blue-500 animate-pulse'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        {[...Array(operationDetails.operation.totalParts)].map((_, i) => (
                          <span key={i}>Part {i + 1}</span>
                        ))}
                      </div>
                    </div>

                    {/* Error Info (if failed) */}
                    {operationDetails.operation.state === 'failed' && operationDetails.operation.lastError && (
                      <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                        <div className="flex items-center gap-2 text-red-400 font-medium mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          Failed at Part {operationDetails.operation.failedPart}
                        </div>
                        <div className="text-sm text-muted-foreground">{operationDetails.operation.lastError}</div>
                      </div>
                    )}

                    {/* Partial Results */}
                    {Object.keys(operationDetails.partialResults || {}).length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Partial Results Available</div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {[1, 2, 3, 4, 5, 6].slice(0, operationDetails.operation.totalParts).map((partNum) => {
                            const partKey = `part${partNum}` as keyof typeof operationDetails.partialResults;
                            const hasContent = !!operationDetails.partialResults[partKey];
                            return (
                              <div
                                key={partNum}
                                className={`p-2 rounded text-center text-sm ${
                                  hasContent
                                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                Part {partNum}
                                {hasContent && <CheckCircle className="h-3 w-3 inline ml-1" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Event Timeline */}
                    <div>
                      <div className="text-sm font-medium mb-2">Event Timeline ({operationDetails.events?.length || 0} events)</div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {operationDetails.events?.slice(0, 10).map((event: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 text-sm p-2 rounded bg-muted/50">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${
                              event.eventType.includes('completed') ? 'bg-green-500' :
                              event.eventType.includes('failed') ? 'bg-red-500' :
                              event.eventType.includes('started') ? 'bg-blue-500' :
                              'bg-muted-foreground'
                            }`} />
                            <div className="flex-1">
                              <div className="font-medium">{event.eventType.replace(/_/g, ' ')}</div>
                              {event.partNumber && <div className="text-xs text-muted-foreground">Part {event.partNumber}</div>}
                              {event.durationMs && <div className="text-xs text-muted-foreground">{(event.durationMs / 1000).toFixed(1)}s</div>}
                              {event.errorMessage && <div className="text-xs text-red-400">{event.errorMessage}</div>}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {event.createdAtFormatted ? new Date(event.createdAtFormatted).toLocaleTimeString() : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    {operationDetails.metrics && (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="p-2 rounded bg-muted">
                          <div className="text-muted-foreground">Avg Part Duration</div>
                          <div className="font-medium">
                            {operationDetails.metrics.avgPartDurationMs
                              ? `${(operationDetails.metrics.avgPartDurationMs / 1000).toFixed(1)}s`
                              : '—'}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-muted">
                          <div className="text-muted-foreground">Total Events</div>
                          <div className="font-medium">{operationDetails.metrics.totalEventsCount}</div>
                        </div>
                        <div className="p-2 rounded bg-muted">
                          <div className="text-muted-foreground">Failure Events</div>
                          <div className="font-medium text-red-400">{operationDetails.metrics.failureEventsCount}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">Operation not found</div>
                )}
              </div>
            )}

            {/* Failed Operations Quick Actions */}
            {retryableOps && retryableOps.operations?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Failed Operations Requiring Attention ({retryableOps.total})
                </h3>
                <div className="space-y-2">
                  {retryableOps.operations.slice(0, 5).map((op: any) => (
                    <div key={op.operationId} className="flex items-center justify-between p-3 rounded bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-red-400 border-red-400/30">
                          {op.tierLabel}
                        </Badge>
                        <span className="text-sm font-mono">{op.sessionId?.slice(0, 12)}...</span>
                        <span className="text-xs text-muted-foreground">Part {op.failedPart || op.currentPart}/{op.totalParts}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-400 border-green-400/30 hover:bg-green-500/10"
                        onClick={() => {
                          if (adminAuth) triggerRegenerationMutation.mutate({ ...adminAuth, sessionId: op.sessionId });
                        }}
                        disabled={triggerRegenerationMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Dashboard */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Activity className="h-5 w-5" />
                System Health & Error Monitoring
              </h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchErrors()}
                  disabled={errorLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${errorLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {errorLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : errorDashboard ? (
              <div className="space-y-6">
                {/* Circuit Breaker Status */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className={`p-4 ${
                    errorDashboard.circuitBreaker.state === 'closed' 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : errorDashboard.circuitBreaker.state === 'open'
                      ? 'border-red-500/50 bg-red-500/5'
                      : 'border-yellow-500/50 bg-yellow-500/5'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Circuit Breaker</p>
                        <p className="text-lg font-bold capitalize flex items-center gap-2">
                          {errorDashboard.circuitBreaker.state === 'closed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {errorDashboard.circuitBreaker.state === 'open' && <XCircle className="h-4 w-4 text-red-500" />}
                          {errorDashboard.circuitBreaker.state === 'half_open' && <Clock className="h-4 w-4 text-yellow-500" />}
                          {errorDashboard.circuitBreaker.state.replace('_', ' ')}
                        </p>
                      </div>
                      {errorDashboard.circuitBreaker.state !== 'closed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resetCircuitBreaker.mutate(adminAuth!)}
                          disabled={resetCircuitBreaker.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                    {errorDashboard.circuitBreaker.state === 'open' && errorDashboard.circuitBreaker.resetTime && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Auto-reset: {new Date(errorDashboard.circuitBreaker.resetTime).toLocaleTimeString()}
                      </p>
                    )}
                  </Card>

                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Recent Failures</p>
                    <p className="text-2xl font-bold">{errorDashboard.circuitBreaker.recentFailures}</p>
                    <p className="text-xs text-muted-foreground">in last 2 minutes</p>
                  </Card>

                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {(errorDashboard.metrics as any).successRate?.toFixed(1) || '100'}%
                    </p>
                    <p className="text-xs text-muted-foreground">last hour</p>
                  </Card>

                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">
                      {errorDashboard.metrics.averageDuration 
                        ? `${(errorDashboard.metrics.averageDuration / 1000).toFixed(1)}s`
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">per analysis</p>
                  </Card>
                </div>

                {/* Health Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      System Health
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Overall Status</span>
                        <Badge variant={
                          errorDashboard.health.status === 'healthy' ? 'default' :
                          errorDashboard.health.status === 'degraded' ? 'secondary' : 'destructive'
                        }>
                          {errorDashboard.health.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Perplexity API</span>
                        <Badge variant={
                          (errorDashboard.health as any).services?.perplexity === 'healthy' ? 'default' : 'destructive'
                        }>
                          {(errorDashboard.health as any).services?.perplexity || 'operational'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Database</span>
                        <Badge variant={
                          (errorDashboard.health as any).services?.database === 'healthy' ? 'default' : 'destructive'
                        }>
                          {(errorDashboard.health as any).services?.database || 'operational'}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Error Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Requests</span>
                        <span className="font-medium">{errorDashboard.metrics.totalRequests || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Successful</span>
                        <span className="font-medium text-green-500">{errorDashboard.metrics.successfulRequests || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Failed</span>
                        <span className="font-medium text-red-500">{errorDashboard.metrics.failedRequests || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Retried</span>
                        <span className="font-medium text-yellow-500">{(errorDashboard.metrics as any).retriedRequests || 0}</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Recent Errors Log */}
                {errorDashboard.dashboard?.recentErrors && errorDashboard.dashboard.recentErrors.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Recent Errors
                    </h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {errorDashboard.dashboard.recentErrors.slice(0, 10).map((error: any, i: number) => (
                        <div key={i} className="text-xs p-2 bg-muted/50 rounded flex justify-between items-start">
                          <div>
                            <code className="text-red-500">{error.code || 'ERROR'}</code>
                            <span className="text-muted-foreground ml-2">{error.message}</span>
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap ml-2">
                            {error.timestamp ? new Date(error.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No error data available</p>
                <p className="text-sm">System monitoring data will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historical Metrics & Analytics */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <BarChart3 className="h-5 w-5" />
                Historical Metrics & Analytics
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-border">
                  <Button
                    variant={metricsTimeRange === 24 ? "default" : "ghost"}
                    size="sm"
                    className="rounded-r-none"
                    onClick={() => setMetricsTimeRange(24)}
                  >
                    24h
                  </Button>
                  <Button
                    variant={metricsTimeRange === 168 ? "default" : "ghost"}
                    size="sm"
                    className="rounded-none border-x"
                    onClick={() => setMetricsTimeRange(168)}
                  >
                    7d
                  </Button>
                  <Button
                    variant={metricsTimeRange === 720 ? "default" : "ghost"}
                    size="sm"
                    className="rounded-l-none"
                    onClick={() => setMetricsTimeRange(720)}
                  >
                    30d
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerAggregation.mutate(adminAuth!)}
                  disabled={triggerAggregation.isPending || !adminAuth}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Aggregate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchMetrics()}
                  disabled={metricsLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[300px] w-full" />
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              </div>
            ) : historicalMetrics ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold">{historicalMetrics.totalRequests}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Timer className="h-3 w-3" />
                      Last {metricsTimeRange}h
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className={`text-2xl font-bold ${historicalMetrics.successRate >= 90 ? 'text-green-500' : historicalMetrics.successRate >= 70 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {historicalMetrics.successRate.toFixed(1)}%
                    </p>
                    <div className="flex items-center gap-1 text-xs mt-1">
                      {historicalMetrics.successRate >= 90 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={historicalMetrics.successRate >= 90 ? 'text-green-500' : 'text-red-500'}>
                        {historicalMetrics.successRate >= 90 ? 'Healthy' : 'Needs attention'}
                      </span>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold">
                      {historicalMetrics.avgDurationMs 
                        ? `${(historicalMetrics.avgDurationMs / 1000).toFixed(1)}s`
                        : 'N/A'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      P95: {historicalMetrics.p95DurationMs 
                        ? `${(historicalMetrics.p95DurationMs / 1000).toFixed(1)}s`
                        : 'N/A'
                      }
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Current Failure Rate</p>
                    <p className={`text-2xl font-bold ${(historicalMetrics.currentFailureRate?.failureRate || 0) < 10 ? 'text-green-500' : 'text-red-500'}`}>
                      {(historicalMetrics.currentFailureRate?.failureRate || 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {historicalMetrics.currentFailureRate?.requests || 0} requests in window
                    </p>
                  </Card>
                </div>

                {/* Hourly Chart - CSS Based */}
                {historicalMetrics.hourlyData && historicalMetrics.hourlyData.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-4">Request Volume Over Time</h3>
                    <div className="h-[250px] flex flex-col">
                      {/* Legend */}
                      <div className="flex gap-4 mb-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded" />
                          <span>Successful</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-500 rounded" />
                          <span>Failed</span>
                        </div>
                      </div>
                      {/* Bar Chart */}
                      <div className="flex-1 flex items-end gap-1">
                        {historicalMetrics.hourlyData.slice(-24).map((h: any, i: number) => {
                          const maxRequests = Math.max(...historicalMetrics.hourlyData.map((d: any) => d.requests || 1));
                          const successHeight = maxRequests > 0 ? ((h.successes || 0) / maxRequests) * 100 : 0;
                          const failHeight = maxRequests > 0 ? ((h.failures || 0) / maxRequests) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                              <div className="w-full flex flex-col-reverse" style={{ height: '180px' }}>
                                <div 
                                  className="w-full bg-green-500 rounded-t transition-all" 
                                  style={{ height: `${successHeight}%` }}
                                />
                                <div 
                                  className="w-full bg-red-500 transition-all" 
                                  style={{ height: `${failHeight}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                                {new Date(h.hour).toLocaleTimeString([], { hour: '2-digit' })}
                              </span>
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                <div className="text-green-500">Success: {h.successes || 0}</div>
                                <div className="text-red-500">Failed: {h.failures || 0}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                )}

                {/* Tier Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-4">Requests by Tier</h3>
                    <div className="h-[200px] flex items-end justify-around gap-4 pt-4">
                      {[
                        { tier: 'Observer', count: historicalMetrics.byTier.standard, color: 'bg-blue-500' },
                        { tier: 'Insider', count: historicalMetrics.byTier.medium, color: 'bg-purple-500' },
                        { tier: 'Syndicate', count: historicalMetrics.byTier.full, color: 'bg-amber-500' },
                      ].map((item) => {
                        const maxCount = Math.max(
                          historicalMetrics.byTier.standard || 1,
                          historicalMetrics.byTier.medium || 1,
                          historicalMetrics.byTier.full || 1
                        );
                        const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        return (
                          <div key={item.tier} className="flex-1 flex flex-col items-center gap-2 group relative">
                            <div className="w-full max-w-[60px] flex flex-col justify-end" style={{ height: '140px' }}>
                              <div 
                                className={`w-full ${item.color} rounded-t transition-all duration-500`}
                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{item.tier}</span>
                            <span className="text-sm font-medium">{item.count}</span>
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              {item.tier}: {item.count} requests
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="text-sm font-medium mb-4">Request Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Successful</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full" 
                              style={{ width: `${historicalMetrics.totalRequests > 0 ? (historicalMetrics.successfulRequests / historicalMetrics.totalRequests) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="font-medium text-green-500">{historicalMetrics.successfulRequests}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Failed</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 rounded-full" 
                              style={{ width: `${historicalMetrics.totalRequests > 0 ? (historicalMetrics.failedRequests / historicalMetrics.totalRequests) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="font-medium text-red-500">{historicalMetrics.failedRequests}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Partial Success</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500 rounded-full" 
                              style={{ width: `${historicalMetrics.totalRequests > 0 ? (historicalMetrics.partialSuccesses / historicalMetrics.totalRequests) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="font-medium text-yellow-500">{historicalMetrics.partialSuccesses}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Retried</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${historicalMetrics.totalRequests > 0 ? (historicalMetrics.retriedRequests / historicalMetrics.totalRequests) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="font-medium text-blue-500">{historicalMetrics.retriedRequests}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No historical data available</p>
                <p className="text-sm">Metrics will appear here as analyses are processed</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retry Queue Status */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <ListRestart className="h-5 w-5" />
                Retry Queue
                {retryQueueStats && (
                  <Badge variant={retryQueueStats.pending > 0 ? "secondary" : "outline"} className="ml-2">
                    {retryQueueStats.pending} pending
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {retryQueueStats && (
                  <Badge variant={retryQueueStats.processorRunning ? "default" : "secondary"}>
                    {retryQueueStats.processorRunning ? "Processor Running" : "Processor Stopped"}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleProcessor.mutate({ 
                    ...adminAuth!, 
                    action: retryQueueStats?.processorRunning ? "stop" : "start" 
                  })}
                  disabled={toggleProcessor.isPending || !adminAuth}
                >
                  {retryQueueStats?.processorRunning ? (
                    <><Pause className="h-4 w-4 mr-2" /> Stop</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Start</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchQueue()}
                  disabled={queueLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${queueLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : retryQueueStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-yellow-500">{retryQueueStats.pending}</p>
                    <p className="text-xs text-muted-foreground">awaiting retry</p>
                  </Card>
                  <Card className="p-4 border-blue-500/30 bg-blue-500/5">
                    <p className="text-xs text-muted-foreground">Processing</p>
                    <p className="text-2xl font-bold text-blue-500">{retryQueueStats.processing}</p>
                    <p className="text-xs text-muted-foreground">in progress</p>
                  </Card>
                  <Card className="p-4 border-green-500/30 bg-green-500/5">
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-500">{retryQueueStats.completed}</p>
                    <p className="text-xs text-muted-foreground">successful</p>
                  </Card>
                  <Card className="p-4 border-red-500/30 bg-red-500/5">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-500">{retryQueueStats.failed}</p>
                    <p className="text-xs text-muted-foreground">max retries</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{retryQueueStats.total}</p>
                    <p className="text-xs text-muted-foreground">all time</p>
                  </Card>
                </div>

                {/* Queue Health Indicator */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {retryQueueStats.pending === 0 && retryQueueStats.processing === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : retryQueueStats.failed > retryQueueStats.completed ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {retryQueueStats.pending === 0 && retryQueueStats.processing === 0 
                          ? "Queue is empty"
                          : retryQueueStats.failed > retryQueueStats.completed
                          ? "High failure rate in queue"
                          : "Queue is processing"
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {retryQueueStats.processorRunning 
                          ? "Background processor is actively processing items"
                          : "Start the processor to begin processing pending items"
                        }
                      </p>
                    </div>
                  </div>
                  {retryQueueStats.total > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {((retryQueueStats.completed / retryQueueStats.total) * 100).toFixed(1)}% success rate
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {retryQueueStats.completed} of {retryQueueStats.total} completed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ListRestart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No queue data available</p>
                <p className="text-sm">Failed analyses will appear here for retry</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Summary by Code */}
        {errorSummary && errorSummary.errors && errorSummary.errors.length > 0 && (
          <Card className="admin-card">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <AlertTriangle className="h-5 w-5" />
                Error Summary by Code
                <Badge variant="destructive" className="ml-2">
                  {errorSummary.errors.length} types
                </Badge>
              </h2>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Error Code</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Last Occurrence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorSummary.errors.map((error: any) => (
                    <TableRow key={error.errorCode}>
                      <TableCell>
                        <code className="text-red-500 bg-red-500/10 px-2 py-1 rounded">
                          {error.errorCode}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {error.count}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(error.lastOccurrence).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Email Subscribers */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Mail className="h-5 w-5" />
                Email Subscribers
                <Badge variant="secondary" className="ml-2">{emailStats.total}</Badge>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs"><strong>Email Subscribers</strong> lists users who signed up via the email gate before viewing the demo. Green = verified email, Yellow = pending verification. Export to CSV for email marketing campaigns. High verification rate indicates quality leads.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-500">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    {emailStats.verified} verified
                  </span>
                  <span className="text-yellow-500">
                    <Clock className="h-4 w-4 inline mr-1" />
                    {emailStats.unverified} pending
                  </span>
                  <span className="text-muted-foreground">
                    {emailStats.verificationRate}% rate
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={exportEmailsToCSV} disabled={emailSubscribers.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {emailLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : emailSubscribers.length > 0 ? (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailSubscribers.map((sub) => (
                      <TableRow key={sub.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{sub.email}</code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => copyToClipboard(sub.email)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {sub.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.isVerified ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(sub.subscribedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {sub.verifiedAt 
                            ? new Date(sub.verifiedAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "—"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No subscribers yet</p>
                <p className="text-sm">Email subscribers from the demo gate will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Calendar className="h-5 w-5" />
                Transaction History
                <Badge variant="secondary" className="ml-2">{filteredTransactions.length}</Badge>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs"><strong>Transaction History</strong> shows all purchases with status tracking. Green = completed, Yellow = pending, Red = failed. Click any transaction to copy its ID. Use search to find specific customers or filter by status. Data syncs in real-time from Stripe and NOWPayments.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by session, wallet, tier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                          if (sortField === "tier") setSortDirection(d => d === "asc" ? "desc" : "asc");
                          else { setSortField("tier"); setSortDirection("asc"); }
                        }}>
                          Tier <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                          if (sortField === "amount") setSortDirection(d => d === "asc" ? "desc" : "asc");
                          else { setSortField("amount"); setSortDirection("desc"); }
                        }}>
                          Amount <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                          if (sortField === "date") setSortDirection(d => d === "asc" ? "desc" : "asc");
                          else { setSortField("date"); setSortDirection("desc"); }
                        }}>
                          Date <ArrowUpDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx: any) => (
                      <TableRow key={tx.id} className="group">
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            {tx.sessionId.slice(0, 8)}...
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => copyToClipboard(tx.sessionId)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              tx.tier === "full" ? "border-purple-500/50 text-purple-400" :
                              tx.tier === "medium" ? "border-indigo-500/50 text-indigo-400" :
                              "border-slate-500/50 text-slate-400"
                            }`}
                          >
                            {tx.tier === "full" ? "Syndicate" : tx.tier === "medium" ? "Insider" : "Observer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">${tx.amountUsd}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.paymentMethod === "stripe" ? (
                              <CreditCard className="h-4 w-4 text-blue-500" />
                            ) : tx.paymentMethod === "coinbase" ? (
                              <Bitcoin className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Wallet className="h-4 w-4 text-purple-500" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">{tx.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {tx.walletAddress ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {formatWallet(tx.walletAddress)}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => copyToClipboard(tx.walletAddress)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <a 
                                href={`https://etherscan.io/address/${tx.walletAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100"
                              >
                                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tx.paymentStatus === "completed" ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : tx.paymentStatus === "pending" ? (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/30">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tx.completedAt 
                            ? new Date(tx.completedAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : new Date(tx.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No transactions yet</p>
                <p className="text-sm">Transactions will appear here once customers make purchases</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============ LOG VIEWER ============ */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Activity className="h-5 w-5" />
                System Logs
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-2 text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs"><strong>System Logs</strong> shows real-time Winston server logs. Red = errors requiring attention, Yellow = warnings, Blue = info. Use this to debug issues, monitor API calls, and track system health. Logs auto-refresh every 5 seconds. Filter by level to focus on specific issues.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value as 'all' | 'error' | 'warn' | 'info')}
                  className="px-3 py-1.5 text-sm rounded-md bg-background border border-border"
                >
                  <option value="all">All Levels</option>
                  <option value="error">Errors Only</option>
                  <option value="warn">Warnings</option>
                  <option value="info">Info</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => refetchLogs()} aria-label="Refresh logs">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : logsData?.logs && logsData.logs.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto space-y-1 font-mono text-xs">
                {logsData.logs.map((log, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-md flex items-start gap-2 ${
                      log.level === 'error' ? 'bg-red-500/10 text-red-400' :
                      log.level === 'warn' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground whitespace-nowrap">{log.timestamp}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        log.level === 'error' ? 'border-red-500/50 text-red-400' :
                        log.level === 'warn' ? 'border-yellow-500/50 text-yellow-400' :
                        'border-blue-500/50 text-blue-400'
                      }`}
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logs available</p>
                <p className="text-xs">Logs will appear here as the system operates</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
