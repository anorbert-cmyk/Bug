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
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              ValidateStrategy provides AI-powered strategic analysis and product validation services. Our Service uses 
              artificial intelligence to analyze business ideas, market opportunities, and strategic decisions. The 
              analyses provided are for informational and educational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. No Guarantee of Results</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">THE SERVICE IS PROVIDED "AS IS" WITHOUT ANY WARRANTIES OF ANY KIND.</strong> We make no 
              representations or warranties regarding the accuracy, completeness, reliability, or suitability of any 
              analysis or information provided through the Service. Any reliance you place on such information is 
              strictly at your own risk.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not guarantee that following our analyses or recommendations will result in business success, 
              profitability, or any specific outcome. Business decisions involve inherent risks, and past performance 
              or AI-generated insights do not guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong className="text-foreground">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</strong>
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>
                In no event shall ValidateStrategy, its directors, employees, partners, agents, suppliers, or affiliates 
                be liable for any indirect, incidental, special, consequential, or punitive damages, including without 
                limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </li>
              <li>
                Our total liability for any claims arising from or related to the Service shall not exceed the amount 
                you paid to us in the twelve (12) months preceding the claim.
              </li>
              <li>
                We shall not be liable for any damages, losses, or costs arising from your business decisions, 
                investments, or actions taken based on our analyses or recommendations.
              </li>
              <li>
                We are not responsible for any third-party actions, products, or services mentioned in our analyses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to defend, indemnify, and hold harmless ValidateStrategy and its officers, directors, employees, 
              contractors, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, 
              awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating 
              to your violation of these Terms or your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of the Service, including but not limited to text, graphics, 
              logos, icons, images, audio clips, digital downloads, and software, are the exclusive property of 
              ValidateStrategy or its licensors and are protected by copyright, trademark, and other intellectual 
              property laws.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You may use the analyses provided to you for your personal or internal business purposes only. You may 
              not redistribute, sell, or publicly share our analyses without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>The accuracy and completeness of information you provide to us</li>
              <li>All business decisions you make based on our analyses</li>
              <li>Compliance with all applicable laws and regulations in your jurisdiction</li>
              <li>Seeking independent professional advice (legal, financial, business) before making significant decisions</li>
              <li>Maintaining the confidentiality of your account credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Payment and Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed securely through our third-party payment processors. By making a purchase, 
              you agree to pay all fees and charges associated with your selected service tier.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">Refund Policy:</strong> Due to the nature of our AI-generated analysis services, 
              all sales are final once the analysis has been initiated. We do not offer refunds for completed or 
              in-progress analyses. If you experience technical issues preventing delivery, please contact us within 
              48 hours of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not guarantee that the Service will be available at all times or without interruption. We reserve 
              the right to modify, suspend, or discontinue the Service (or any part thereof) at any time without notice. 
              We shall not be liable to you or any third party for any modification, suspension, or discontinuation of 
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Governing Law and Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, 
              United States, without regard to its conflict of law provisions.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Any dispute arising from or relating to these Terms or the Service shall be resolved through binding 
              arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall 
              take place in Delaware, and the arbitrator's decision shall be final and binding.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">CLASS ACTION WAIVER:</strong> You agree that any dispute resolution proceedings 
              will be conducted only on an individual basis and not in a class, consolidated, or representative action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by 
              posting the updated Terms on our website with a new "Last Updated" date. Your continued use of the 
              Service after such modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck 
              and the remaining provisions shall be enforced to the fullest extent under law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
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
