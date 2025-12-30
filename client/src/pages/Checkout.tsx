import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
// LemonSqueezy uses hosted checkout - no SDK needed
import { 
  CreditCard, 
  Wallet, 
  ArrowLeft, 
  Shield, 
  Lock,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Zap
} from "lucide-react";

const TIER_INFO = {
  standard: { name: "Observer", price: 29, badge: "tier-badge-standard", icon: "👁️" },
  medium: { name: "Insider", price: 79, badge: "tier-badge-medium", icon: "🔮" },
  full: { name: "Syndicate", price: 199, badge: "tier-badge-full", icon: "⚡" },
};

// LemonSqueezy uses hosted checkout page - no client-side initialization needed


export default function Checkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<"lemonsqueezy" | "coinbase" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: session, isLoading: sessionLoading } = trpc.session.get.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  const { data: paymentConfig } = trpc.config.getPaymentConfig.useQuery();

  const createLemonSqueezyCheckout = trpc.payment.createLemonSqueezyCheckout.useMutation({
    onSuccess: (data: { checkoutUrl?: string }) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: { message: string }) => {
      toast.error("Payment setup failed", { description: error.message });
      setIsProcessing(false);
      setPaymentMethod(null);
    },
  });

  const createCoinbaseCharge = trpc.payment.createCoinbaseCharge.useMutation({
    onSuccess: (data) => {
      if (data.hostedUrl) {
        window.location.href = data.hostedUrl;
      }
    },
    onError: (error) => {
      toast.error("Payment failed", { description: error.message });
      setIsProcessing(false);
    },
  });

  const handleSelectPaymentMethod = (method: "lemonsqueezy" | "coinbase") => {
    if (!session) return;
    
    setPaymentMethod(method);
    setIsProcessing(true);

    if (method === "lemonsqueezy") {
      createLemonSqueezyCheckout.mutate({
        sessionId: session.sessionId,
        tier: session.tier as "standard" | "medium" | "full",
        problemStatement: session.problemStatement,
        email: session.email || undefined,
        isPriority: session.isPriority,
        prioritySource: session.prioritySource || undefined,
      });
    } else if (method === "coinbase") {
      createCoinbaseCharge.mutate({
        sessionId: session.sessionId,
        tier: session.tier as "standard" | "medium" | "full",
        problemStatement: session.problemStatement,
      });
    }
  };

  const handlePaymentSuccess = () => {
    toast.success("Payment successful!");
    navigate(`/payment-success/${sessionId}`);
  };

  const handlePaymentError = (error: string) => {
    toast.error("Payment failed", { description: error });
    setIsProcessing(false);
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Session not found</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tierInfo = TIER_INFO[session.tier as keyof typeof TIER_INFO] || TIER_INFO.standard;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-2">Complete Your Order</h1>
                <p className="text-muted-foreground">
                  Secure checkout powered by Stripe
                </p>
              </div>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{tierInfo.icon}</span>
                    {tierInfo.name} Package
                  </CardTitle>
                  <CardDescription>Strategic UX Analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm font-medium mb-2">Problem Statement:</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.problemStatement}
                    </p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${tierInfo.price}.00</span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${tierInfo.price}.00 USD</span>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Trust Elements */}
              <div className="space-y-4">
                {/* Security badges */}
                <div className="flex items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">SSL Secured</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">256-bit Encryption</span>
                  </div>
                </div>
                
                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="24" rx="4" fill="#635BFF"/>
                      <path d="M12 6.5c-2.5 0-4.5 1.5-4.5 3.5 0 2.5 3 3 4.5 3.5 1 .3 1.5.6 1.5 1 0 .5-.5 1-1.5 1s-2-.5-2.5-1l-1 2c1 .7 2 1 3.5 1 2.5 0 4.5-1.5 4.5-3.5 0-2.5-3-3-4.5-3.5-1-.3-1.5-.6-1.5-1 0-.5.5-1 1.5-1s2 .5 2.5 1l1-2c-1-.7-2-1-3.5-1z" fill="white"/>
                    </svg>
                    <span className="text-xs text-muted-foreground">Powered by Stripe</span>
                  </div>
                  <div className="h-4 w-px bg-border"></div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">PCI Compliant</span>
                  </div>
                </div>
                
                {/* Guarantee text */}
                <p className="text-center text-xs text-muted-foreground">
                  Your payment information is encrypted and secure. We never store your card details.
                </p>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Select Payment Method</h2>

              <div className="space-y-4">
                {/* LemonSqueezy Card Payment */}
                  <Card 
                    className={`glass-panel cursor-pointer transition-all hover:border-primary/50 ${
                      paymentMethod === "lemonsqueezy" ? "border-primary/50 bg-primary/5" : ""
                    }`}
                    onClick={() => !isProcessing && paymentConfig?.lemonSqueezyEnabled && handleSelectPaymentMethod("lemonsqueezy")}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-medium">Credit / Debit Card</p>
                            <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex, Apple Pay, Google Pay</p>
                          </div>
                        </div>
                        {paymentMethod === "lemonsqueezy" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : paymentConfig?.lemonSqueezyEnabled ? (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Unavailable
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Crypto Payment */}
                  <Card 
                    className={`glass-panel cursor-pointer transition-all hover:border-primary/50 ${
                      paymentMethod === "coinbase" ? "border-primary/50 bg-primary/5" : ""
                    }`}
                    onClick={() => !isProcessing && paymentConfig?.coinbaseEnabled && handleSelectPaymentMethod("coinbase")}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                            <Wallet className="h-5 w-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium">Cryptocurrency</p>
                            <p className="text-xs text-muted-foreground">BTC, ETH, USDC via Coinbase</p>
                          </div>
                        </div>
                        {paymentMethod === "coinbase" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : paymentConfig?.coinbaseEnabled ? (
                          <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
              </div>

              {/* What happens next */}
              <Card className="glass-panel bg-muted/20">
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    What happens next?
                  </h3>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      <span>Complete your secure payment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <span>Our AI begins analyzing your problem</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      <span>Receive your strategic analysis via email</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
