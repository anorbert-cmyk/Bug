import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";

// Critical path - load immediately
import Home from "./pages/Home";

// Lazy load non-critical routes for better initial load performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Checkout = lazy(() => import("./pages/Checkout"));
const AnalysisResult = lazy(() => import("./pages/AnalysisResult"));
const Admin = lazy(() => import("./pages/Admin"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const History = lazy(() => import("./pages/History"));
const MyAnalyses = lazy(() => import("./pages/MyAnalyses"));
const DemoAnalysis = lazy(() => import("./pages/DemoAnalysis"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/checkout/:sessionId" component={Checkout} />
        <Route path="/analysis/:sessionId" component={AnalysisResult} />
        <Route path="/admin" component={Admin} />
        <Route path="/payment-success/:sessionId" component={PaymentSuccess} />
        <Route path="/history" component={History} />
        <Route path="/my-analyses" component={MyAnalyses} />
        <Route path="/demo-analysis" component={DemoAnalysis} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/404" component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
