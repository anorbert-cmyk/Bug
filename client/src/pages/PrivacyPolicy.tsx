import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 5, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ValidateStrategy ("Company," "we," "us," or "our") is committed to protecting your privacy. This Privacy 
              Policy explains our minimal data collection practices when you use our AI-powered strategic analysis 
              service ("Service"). We believe in data minimization—we only collect what is absolutely necessary to 
              deliver our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. What We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We practice strict data minimization. The only personal information we collect is:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Email Address (Optional):</strong> Only if you choose to provide it 
                for receiving notifications when your analysis is complete and transaction status updates for cryptocurrency 
                payments.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              <strong className="text-foreground">We do NOT collect:</strong> Names, addresses, phone numbers, social 
              media profiles, browsing history, location data, or any other personally identifiable information. We do 
              not use tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Your Business Ideas & IP Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your ideas are processed in an <strong className="text-foreground">ephemeral, encrypted environment</strong>. 
              We are not a VC firm—we don't pick winners, we build them. Your intellectual property remains 100% yours, 
              analyzed by machines, not humans. Business ideas and strategies you submit are processed solely to generate 
              your analysis and are not stored permanently or used for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Email</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you provide your email address, we use it exclusively for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Notifying you when your strategic analysis is complete and ready for download</li>
              <li>Sending transaction status updates for cryptocurrency payments</li>
              <li>Delivering invoices after successful payments</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We will never sell, rent, or share your email address with third parties for marketing purposes. We do 
              not send promotional emails or newsletters unless you explicitly opt in.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              All data is encrypted both in transit (using TLS/SSL) and at rest. We implement industry-standard security 
              measures to protect against unauthorized access, alteration, disclosure, or destruction of data. Our 
              infrastructure is designed with security as a priority.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Payment Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not store payment credentials. Payment processing is currently handled by NOWPayments for 
              cryptocurrency. Credit/debit card payments via Stripe are coming soon. These processors have their 
              own privacy policies and security measures. We only receive confirmation of successful transactions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use only essential cookies required for the Service to function properly (such as session management). 
              We do not use advertising cookies, tracking pixels, or third-party analytics that collect personal data. 
              Basic, anonymized usage analytics may be collected to improve service performance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Stripe:</strong> For processing card payments (coming soon, PCI-DSS compliant)</li>
              <li><strong className="text-foreground">NOWPayments:</strong> For processing cryptocurrency payments</li>
              <li><strong className="text-foreground">AI Processing:</strong> For generating strategic analyses (data processed under strict confidentiality)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              These services process data according to their own privacy policies and are selected for their strong 
              security and privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Email addresses are retained only as long as necessary to provide the Service. Analysis results are 
              available for download for a limited period, after which they may be automatically deleted. You may 
              request deletion of your email address at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Request access to any email address we have stored for you</li>
              <li>Request deletion of your email address from our systems</li>
              <li>Opt out of receiving any email communications</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, contact us at privacy@validatestrategy.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect any 
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. International Users</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is available globally. By using the Service, you consent to the transfer of your email 
              address (if provided) to servers that may be located outside your country of residence. All transfers 
              are protected by encryption.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an 
              updated "Last Updated" date. Continued use of the Service after changes constitutes acceptance of the 
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong className="text-foreground">Email:</strong> privacy@validatestrategy.com
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border flex gap-6">
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
