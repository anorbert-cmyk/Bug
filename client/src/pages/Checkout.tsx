import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Wallet, 
  ArrowLeft, 
  Shield, 
  Lock,
  Loader2,
  CheckCircle2,
  Zap,
  Mail,
  Bitcoin
} from "lucide-react";

const TIER_INFO = {
  standard: { name: "Observer", price: 49, badge: "tier-badge-standard", icon: "👁️" },
  medium: { name: "Insider", price: 99, badge: "tier-badge-medium", icon: "🔮" },
  full: { name: "Syndicate", price: 199, badge: "tier-badge-full", icon: "⚡" },
};

export default function Checkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading } = trpc.session.get.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  const { data: paymentConfig } = trpc.config.getPaymentConfig.useQuery();

  // NOWPayments - Primary crypto payment method
  const createNowPaymentsInvoice = trpc.payment.createNowPaymentsInvoice.useMutation({
    onSuccess: (data) => {
      if (data.invoiceUrl) {
        // Redirect to NOWPayments hosted checkout
        window.location.href = data.invoiceUrl;
      }
    },
    onError: (error) => {
      toast.error("Payment setup failed", { description: error.message });
      setIsProcessing(false);
    },
  });

  const validateEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailToValidate.trim()) {
      setEmailError("Email is required to receive your analysis");
      return false;
    }
    if (!emailRegex.test(emailToValidate)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handlePayWithCrypto = () => {
    if (!session) return;
    
    // Validate email before proceeding
    if (!validateEmail(email)) {
      toast.error("Please enter your email", { description: "We need your email to send the analysis results" });
      return;
    }
    
    setIsProcessing(true);

    createNowPaymentsInvoice.mutate({
      sessionId: session.sessionId,
      tier: session.tier as "standard" | "medium" | "full",
      problemStatement: session.problemStatement,
      email: email,
    });
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
                  Secure cryptocurrency payment via NOWPayments
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
                    <Bitcoin className="h-6 w-6 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Powered by NOWPayments</span>
                  </div>
                  <div className="h-4 w-px bg-border"></div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">200+ Cryptocurrencies</span>
                  </div>
                </div>
                
                {/* Guarantee text */}
                <p className="text-center text-xs text-muted-foreground">
                  Your payment is processed securely. Analysis begins only after payment confirmation.
                </p>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-6">
              {/* Email Input */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Your Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    className={`pl-4 pr-4 py-3 h-12 text-base ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    disabled={isProcessing}
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-red-500">{emailError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  We'll send your strategic analysis to this email address
                </p>
              </div>

              <Separator />

              <h2 className="text-lg font-semibold">Payment Method</h2>

              <div className="space-y-4">
                {/* NOWPayments Crypto Payment */}
                <Card 
                  className={`glass-panel cursor-pointer transition-all hover:border-primary/50 ${
                    isProcessing ? "border-primary/50 bg-primary/5" : ""
                  }`}
                  onClick={() => !isProcessing && paymentConfig?.nowPaymentsEnabled && handlePayWithCrypto()}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium">Pay with Cryptocurrency</p>
                          <p className="text-xs text-muted-foreground">BTC, ETH, USDT, USDC, LTC, DOGE & 200+ more</p>
                        </div>
                      </div>
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : paymentConfig?.nowPaymentsEnabled ? (
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

                {/* Credit Card - Coming Soon */}
                <Card className="glass-panel opacity-60">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                          <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                            <line x1="1" y1="10" x2="23" y2="10"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Credit / Debit Card</p>
                          <p className="text-xs text-muted-foreground">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-muted-foreground">
                        Coming Soon
                      </Badge>
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
                      <span>Select your cryptocurrency and complete payment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      <span>Once confirmed, our AI begins analyzing your problem</span>
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
