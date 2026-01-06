import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 5, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using ValidateStrategy ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
              If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally 
              binding agreement between you and ValidateStrategy ("Company," "we," "us," or "our").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-muted-foreground leading-relaxed">
              ValidateStrategy is an AI-powered strategic analysis service. We run your problem statement through a 
              4-phase adversarial stress-test: (1) Discovery & Problem Anatomy, (2) Strategic Design & Roadmap, 
              (3) AI Toolkit & Prompts, and (4) Risk Assessment & ROI. The output is a tactical markdown report 
              including Executive Summary, Market Math, Competitor Analysis, Tech Stack recommendations, 
              Production-Ready Prompts, and a Risk Matrix.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Intellectual Property Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Your ideas remain 100% yours.</strong> All business ideas, strategies, 
              and information you submit are processed in an ephemeral, encrypted environment. Your intellectual property 
              is analyzed by machines, not humans. We are not a VC firm—we don't pick winners, we build them. We do not 
              claim any ownership rights over your submitted content or the ideas contained therein.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Service Tiers</h2>
            <p className="text-muted-foreground leading-relaxed">
              We offer multiple service tiers, each triggering a different depth of cognitive processing. Higher tiers 
              use more expensive, deeper reasoning chains (such as APEX processing). The tier you select determines the 
              comprehensiveness and depth of your analysis. Tier selection is final at the time of purchase and cannot 
              be changed after processing begins.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Payment Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We currently accept payment via cryptocurrency (processed by NOWPayments). Credit/debit card payments (via Stripe) are coming soon. 
              All prices are displayed in USD unless otherwise specified. Payment is required before analysis processing begins.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Cryptocurrency Payments:</strong> For crypto payments, you may optionally 
              provide an email address to receive transaction status updates. Crypto transactions are subject to network 
              confirmation times and fees determined by the respective blockchain networks.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">All sales are final.</strong> Since we burn significant GPU compute 
              resources to generate your unique strategy instantly, refunds are not available. We provide a full Demo 
              Analysis on our website so you can see exactly what the output looks like before purchasing. By completing 
              a purchase, you acknowledge that you have reviewed the demo and understand the nature of the deliverable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 
              We do not guarantee that our analyses will result in business success, funding, or any particular outcome. 
              Our reports are based on AI-generated patterns and data analysis—they are not a substitute for professional 
              business, legal, or financial advice. The information provided is for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VALIDATESTRATEGY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS 
              OPPORTUNITIES, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. Our total liability for 
              any claims arising from your use of the Service shall not exceed the amount you paid for the specific 
              analysis in question.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless ValidateStrategy and its officers, directors, employees, 
              and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) 
              arising out of or related to your use of the Service, your violation of these Terms, or your violation of 
              any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to use the Service for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Any unlawful purpose or to promote illegal activities</li>
              <li>Submitting content that infringes on intellectual property rights of others</li>
              <li>Attempting to reverse engineer, decompile, or extract our AI models or algorithms</li>
              <li>Automated scraping or bulk access without prior written consent</li>
              <li>Any activity that could damage, disable, or impair the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We reserve 
              the right to modify, suspend, or discontinue the Service (or any part thereof) at any time with or without 
              notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance 
              of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which 
              ValidateStrategy operates, without regard to its conflict of law provisions. Any disputes arising under 
              these Terms shall be resolved through binding arbitration in accordance with applicable arbitration rules.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting 
              to this page with an updated "Last Updated" date. Your continued use of the Service after any changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck 
              and the remaining provisions shall be enforced to the fullest extent under law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong className="text-foreground">Email:</strong> legal@validatestrategy.com
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border flex gap-6">
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
