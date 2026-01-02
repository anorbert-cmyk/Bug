import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, FileText, Target, Lightbulb, AlertTriangle, Mail, Lock, Sparkles, Zap, Clock } from "lucide-react";

// Demo analysis data - same structure as real analysis
const DEMO_ANALYSIS = {
  part1: {
    title: "Discovery & Problem Analysis",
    icon: Target,
    content: `# Discovery & Problem Analysis

## Problem Context
The challenge of building a SaaS platform for strategic UX analysis represents a complex intersection of AI capabilities, user experience design, and business model validation...

[Full demo content would go here - this is just a preview]`
  },
  part2: {
    title: "Strategic Design & Roadmap",
    icon: FileText,
    content: `# Strategic Design & Roadmap

## Phase 1: Foundation (Weeks 1-4)
- Core AI integration setup
- Basic user authentication
- Payment processing infrastructure

[Full demo content would go here]`
  },
  part3: {
    title: "AI Toolkit & Figma Prompts",
    icon: Lightbulb,
    content: `# AI Toolkit & Figma Prompts

## Figma Design Prompts
\`\`\`
Create a modern SaaS dashboard with dark mode support...
\`\`\`

[Full demo content would go here]`
  },
  part4: {
    title: "Risk, Metrics & Rationale",
    icon: AlertTriangle,
    content: `# Risk, Metrics & Rationale

## Key Risks
1. AI API reliability and cost management
2. User acquisition in competitive market
3. Payment processing complexity

[Full demo content would go here]`
  }
};

export default function DemoAnalysis() {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    part1: false,
    part2: false,
    part3: false,
    part4: false
  });
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  // Check if email was already submitted
  useEffect(() => {
    const submitted = localStorage.getItem("demo_email_submitted");
    if (submitted) {
      setEmailSubmitted(true);
      // Auto-expand first section if email already submitted
      setExpandedSections(prev => ({ ...prev, part1: true }));
    }
  }, []);

  const toggleSection = (section: string) => {
    // Prevent interaction if email not submitted
    if (!emailSubmitted) {
      return;
    }
    
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailSubmitted(true);
    setEmailError("");
    localStorage.setItem("demo_email_submitted", "true");
    localStorage.setItem("demo_email", email);
    // Auto-expand first section after email submission
    setExpandedSections(prev => ({ ...prev, part1: true }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Demo Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Sample APEX Strategic Analysis Output
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Problem Statement - Always visible */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Problem Statement</h2>
          <p className="text-muted-foreground">
            "I want to build a SaaS platform that provides AI-powered strategic UX analysis for startups and product teams."
          </p>
        </Card>

        {/* Email Gate - Show if email not submitted */}
        {!emailSubmitted && (
          <Card className="p-8 mb-6 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">
                Unlock the Full Demo Analysis
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Enter your email to access the complete demo and see what a full APEX analysis looks like.
              </p>

              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Zero Spam</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Early Access</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>5 Sec Setup</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailSubmit} className="w-full max-w-md space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    className="pl-10"
                  />
                </div>
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
                <Button type="submit" className="w-full" size="lg">
                  Unlock Full Demo
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-4">
                No credit card required • Unsubscribe anytime
              </p>
            </div>
          </Card>
        )}

        {/* Analysis Parts - Locked/Blurred if email not submitted */}
        <div className="space-y-4 relative">
          {/* Blur overlay if not submitted */}
          {!emailSubmitted && (
            <div className="absolute inset-0 z-10 pointer-events-none" />
          )}
          
          <div className={!emailSubmitted ? "blur-md opacity-50 pointer-events-none select-none" : ""}>
            {Object.entries(DEMO_ANALYSIS).map(([key, part]) => {
              const Icon = part.icon;
              const isExpanded = expandedSections[key];

              return (
                <Card key={key} className="overflow-hidden mb-4">
                  <button
                    onClick={() => toggleSection(key)}
                    disabled={!emailSubmitted}
                    className={`w-full p-6 flex items-center justify-between transition-colors ${
                      emailSubmitted ? "hover:bg-accent/50 cursor-pointer" : "cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold">{part.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {emailSubmitted 
                            ? `Click to ${isExpanded ? "collapse" : "expand"}`
                            : "Unlock with email to view"
                          }
                        </p>
                      </div>
                    </div>
                    {emailSubmitted && (
                      isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )
                    )}
                    {!emailSubmitted && (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && emailSubmitted && (
                    <div className="px-6 pb-6 border-t">
                      <div className="prose prose-invert max-w-none mt-6">
                        <p className="text-muted-foreground whitespace-pre-line">
                          {part.content}
                        </p>
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground italic">
                            This is a demo preview. Full analysis content would appear here after purchase.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-8 mt-8 text-center bg-gradient-to-br from-primary/10 to-purple-500/10">
          <h2 className="text-2xl font-bold mb-4">
            Get Your Own Strategic Analysis
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            This is just a sample. Get a complete APEX analysis tailored to your specific problem statement with actionable insights and strategic recommendations.
          </p>
          <Button size="lg" onClick={() => window.location.href = "/#pricing"}>
            Start Your Analysis
          </Button>
        </Card>
      </div>
    </div>
  );
}
