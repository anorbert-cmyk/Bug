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
  RotateCcw
} from "lucide-react";

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
      const message = `Rapid Apollo Admin Login\n\nChallenge: ${challenge}\nTimestamp: ${timestamp}\n\nSign this message to authenticate.`;
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl sticky top-0 z-10 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-bold text-lg">Admin Dashboard</h1>
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
            <Button variant="ghost" size="sm" onClick={() => { refetchStats(); refetchTx(); refetchEmails(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel">
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

          <Card className="glass-panel">
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

          <Card className="glass-panel">
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

          <Card className="glass-panel">
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
          <Card className="glass-panel">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <PieChart className="h-5 w-5" />
                Tier Distribution
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
                    { tier: "Observer", count: stats?.tierDistribution?.standard || 0, color: "bg-slate-500", price: "$9" },
                    { tier: "Insider", count: stats?.tierDistribution?.medium || 0, color: "bg-indigo-500", price: "$29" },
                    { tier: "Syndicate", count: stats?.tierDistribution?.full || 0, color: "bg-purple-500", price: "$79" },
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
          <Card className="glass-panel">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <BarChart3 className="h-5 w-5" />
                Payment Methods
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
                    { method: "Coinbase (Crypto)", count: stats?.paymentMethodDistribution?.coinbase || 0, icon: Bitcoin, color: "bg-orange-500" },
                  ].map((item) => {
                    const total = (stats?.paymentMethodDistribution?.stripe || 0) + 
                                  (stats?.paymentMethodDistribution?.coinbase || 0);
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
        <Card className="glass-panel">
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

        {/* Error Dashboard */}
        <Card className="glass-panel">
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

        {/* Email Subscribers */}
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Mail className="h-5 w-5" />
                Email Subscribers
                <Badge variant="secondary" className="ml-2">{emailStats.total}</Badge>
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
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                <Calendar className="h-5 w-5" />
                Transaction History
                <Badge variant="secondary" className="ml-2">{filteredTransactions.length}</Badge>
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
      </div>
    </div>
  );
}
