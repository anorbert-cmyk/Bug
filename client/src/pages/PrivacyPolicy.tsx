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
              ValidateStrategy ("Company," "we," "us," or "our") respects your privacy and is committed to protecting 
              your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our AI-powered strategic analysis service ("Service").
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              By using our Service, you consent to the data practices described in this Privacy Policy. If you do not 
              agree with the terms of this Privacy Policy, please do not access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 mt-6 text-foreground">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Account Information:</strong> Email address, name, and authentication credentials when you create an account</li>
              <li><strong className="text-foreground">Business Information:</strong> Business ideas, strategies, market data, and other information you submit for analysis</li>
              <li><strong className="text-foreground">Payment Information:</strong> Payment details processed through our third-party payment processors (Stripe, cryptocurrency payment providers)</li>
              <li><strong className="text-foreground">Communications:</strong> Any correspondence you send to us, including support requests</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6 text-foreground">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong className="text-foreground">Usage Data:</strong> Pages visited, features used, time spent on the Service</li>
              <li><strong className="text-foreground">Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong className="text-foreground">Cookies and Tracking Technologies:</strong> Session cookies, analytics cookies, and similar technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Service Delivery:</strong> To provide, maintain, and improve our AI-powered analysis services</li>
              <li><strong className="text-foreground">Account Management:</strong> To create and manage your account, process transactions, and send service-related communications</li>
              <li><strong className="text-foreground">AI Processing:</strong> To process your business information through our AI systems to generate strategic analyses</li>
              <li><strong className="text-foreground">Customer Support:</strong> To respond to your inquiries and provide technical support</li>
              <li><strong className="text-foreground">Analytics:</strong> To analyze usage patterns and improve our Service</li>
              <li><strong className="text-foreground">Security:</strong> To detect, prevent, and address technical issues and fraudulent activity</li>
              <li><strong className="text-foreground">Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Service Providers:</strong> With third-party vendors who assist in operating our Service (payment processors, cloud hosting, analytics providers)</li>
              <li><strong className="text-foreground">AI Processing:</strong> With AI service providers to generate analyses (data is processed according to strict confidentiality agreements)</li>
              <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
              <li><strong className="text-foreground">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong className="text-foreground">Protection of Rights:</strong> To protect our rights, privacy, safety, or property, or that of our users or others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal data 
              against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls limiting data access to authorized personnel</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we 
              strive to protect your personal data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data only for as long as necessary to fulfill the purposes for which it was 
              collected, including to satisfy legal, accounting, or reporting requirements. The retention period 
              may vary depending on the context and our legal obligations.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Analysis results and associated business information are retained for a period of 12 months from the 
              date of generation, after which they may be automatically deleted unless you request earlier deletion 
              or extended retention.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Access:</strong> Request access to your personal data</li>
              <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong className="text-foreground">Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
              <li><strong className="text-foreground">Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong className="text-foreground">Objection:</strong> Object to certain processing of your data</li>
              <li><strong className="text-foreground">Withdrawal of Consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at privacy@validatestrategy.com. We will respond to your 
              request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar tracking technologies to collect and track information about your use of 
              our Service. Types of cookies we use include:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Essential Cookies:</strong> Required for the Service to function properly</li>
              <li><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how users interact with our Service</li>
              <li><strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can control cookies through your browser settings. However, disabling certain cookies may affect 
              the functionality of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service may contain links to third-party websites or integrate with third-party services. We are 
              not responsible for the privacy practices of these third parties. We encourage you to review the 
              privacy policies of any third-party services you access through our Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Third-party services we use include:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Stripe (payment processing)</li>
              <li>Cryptocurrency payment processors</li>
              <li>Cloud hosting providers</li>
              <li>AI service providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of residence. 
              These countries may have data protection laws that are different from the laws of your country. We take 
              appropriate safeguards to ensure that your personal data remains protected in accordance with this 
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal 
              data from children. If you are a parent or guardian and believe your child has provided us with personal 
              data, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are a California resident, you have specific rights under the California Consumer Privacy Act 
              (CCPA), including the right to know what personal information we collect, the right to delete your 
              personal information, and the right to opt-out of the sale of your personal information. We do not 
              sell personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. European Privacy Rights (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are located in the European Economic Area (EEA), you have certain rights under the General Data 
              Protection Regulation (GDPR). Our legal basis for processing your personal data depends on the specific 
              context, including performance of a contract, legitimate interests, and consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by 
              posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you 
              to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p><strong className="text-foreground">Email:</strong> privacy@validatestrategy.com</p>
              <p className="mt-2"><strong className="text-foreground">Data Protection Officer:</strong> dpo@validatestrategy.com</p>
            </div>
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
