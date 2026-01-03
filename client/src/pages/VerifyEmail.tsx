import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);

  const verifyMutation = trpc.emailSubscriber.verify.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setEmail(data.email || null);
      // Store verified status in localStorage
      localStorage.setItem("demo_analysis_unlocked", "true");
      localStorage.setItem("demo_analysis_email_verified", "true");
    },
    onError: () => {
      setStatus("error");
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate({ token });
    } else {
      setStatus("error");
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {status === "loading" && (
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle className="text-xl mb-2">Verifying your email...</CardTitle>
              <CardDescription>Please wait while we confirm your email address.</CardDescription>
            </CardContent>
          </Card>
        )}

        {status === "success" && (
          <Card className="border-green-500/30 bg-card/50 backdrop-blur">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-xl mb-2 text-green-400">Email Verified!</CardTitle>
              <CardDescription className="mb-6">
                {email ? (
                  <>Your email <span className="text-foreground font-medium">{email}</span> has been verified.</>
                ) : (
                  "Your email has been successfully verified."
                )}
              </CardDescription>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/demo-analysis")}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                >
                  View Full Demo Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </div>

              <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Check your inbox for a welcome email with exclusive resources.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card className="border-red-500/30 bg-card/50 backdrop-blur">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-xl mb-2 text-red-400">Verification Failed</CardTitle>
              <CardDescription className="mb-6">
                This verification link is invalid or has expired. Please try subscribing again.
              </CardDescription>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/demo-analysis")}
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
