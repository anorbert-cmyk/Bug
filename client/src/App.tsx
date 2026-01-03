import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import AnalysisResult from "./pages/AnalysisResult";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";
import History from "./pages/History";
import MyAnalyses from "./pages/MyAnalyses";
import DemoAnalysis from "./pages/DemoAnalysis";
import VerifyEmail from "./pages/VerifyEmail";

function Router() {
  return (
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
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
