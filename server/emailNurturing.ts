import { getDb } from "./db";
import { emailSubscribers, emailSequenceStatus } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { getTrackingPixelHtml } from "./emailTracking";

// Resend API configuration
const RESEND_API_URL = "https://api.resend.com/emails";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Base URL for links in emails
const getBaseUrl = () => {
  return 'https://aetherlogic.io';
};

/**
 * Generate tracking ID for an email
 */
function generateEmailTrackingId(subscriberId: number, emailNumber: number): string {
  const uniquePart = Math.random().toString(36).substring(2, 10);
  return `${subscriberId}-${emailNumber}-${uniquePart}`;
}

/**
 * Email 1: Welcome + Value Delivery
 * Sent immediately after subscription
 */
function getEmail1Template(email: string, subscriberId: number = 0): EmailTemplate {
  const baseUrl = getBaseUrl();
  const firstName = email.split('@')[0].split('.')[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const trackingId = generateEmailTrackingId(subscriberId, 1);
  const trackingPixel = getTrackingPixelHtml(trackingId, baseUrl);
  
  return {
    subject: "Your strategic analysis toolkit is ready ⚡",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Aether Logic</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Aether Logic
              </h1>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">Strategic Analysis Platform</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
                Hi ${capitalizedName}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                Thank you for exploring the Aether Logic demo! You've just taken the first step toward building with confidence instead of assumptions.
              </p>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                I noticed you spent time with our <strong style="color: #8b5cf6;">APEX strategic analysis framework</strong>. That tells me you're serious about validating your idea before investing months of development time.
              </p>
              
              <!-- Value Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3); margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #8b5cf6; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      What You'll Learn
                    </p>
                    <p style="margin: 0; color: #d1d5db; font-size: 15px; line-height: 1.6;">
                      Over the next two weeks, I'll share exclusive insights on how founders like you are using strategic analysis to validate ideas faster and build with confidence.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Coming Up -->
              <p style="margin: 0 0 16px; color: #ffffff; font-size: 16px; font-weight: 600;">
                Coming up in your inbox:
              </p>
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #d1d5db; font-size: 15px; line-height: 1.8;">
                <li>Real founder stories and how strategic analysis changed their trajectory</li>
                <li>The hidden blind spots that trip up even experienced entrepreneurs</li>
                <li>An exclusive offer reserved only for demo viewers like you</li>
              </ul>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Explore Aether Logic →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Talk soon,<br>
                <strong style="color: #d1d5db;">The Aether Logic Team</strong>
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; font-style: italic;">
                P.S. Hit reply if you have any questions about what you saw in the demo. We read every email personally.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(139, 92, 246, 0.1);">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                © 2024 Aether Logic. All rights reserved.<br>
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${trackingPixel}
</body>
</html>
    `,
    text: `Hi ${capitalizedName}!

Thank you for exploring the Aether Logic demo! You've just taken the first step toward building with confidence instead of assumptions.

I noticed you spent time with our APEX strategic analysis framework. That tells me you're serious about validating your idea before investing months of development time.

Over the next two weeks, I'll share:
• Real founder stories and how strategic analysis changed their trajectory
• The hidden blind spots that trip up even experienced entrepreneurs
• An exclusive offer reserved only for demo viewers like you

Explore Aether Logic: ${baseUrl}

Talk soon,
The Aether Logic Team

P.S. Hit reply if you have any questions about what you saw in the demo. We read every email personally.

---
Unsubscribe: ${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}
    `
  };
}

/**
 * Email 2: Social Proof + Founder Story
 * Sent 2-3 days after subscription
 */
function getEmail2Template(email: string, subscriberId: number = 0): EmailTemplate {
  const baseUrl = getBaseUrl();
  const firstName = email.split('@')[0].split('.')[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const trackingId = generateEmailTrackingId(subscriberId, 2);
  const trackingPixel = getTrackingPixelHtml(trackingId, baseUrl);
  
  return {
    subject: "How a founder validated their idea in 48 hours",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Aether Logic
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="margin: 0 0 24px; color: #ffffff; font-size: 22px; font-weight: 600;">
                Quick story for you, ${capitalizedName}:
              </h2>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                Last month, a founder came to us with an idea they'd been sitting on for <strong style="color: #ffffff;">6 months</strong>. They had the skills to build it, but something held them back.
              </p>
              
              <!-- Quote Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-left: 4px solid #8b5cf6; padding-left: 20px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 16px; font-style: italic; line-height: 1.6;">
                      "I kept second-guessing myself. What if I build it and nobody wants it?"
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                Sound familiar?
              </p>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                They ran their idea through the full APEX analysis. In <strong style="color: #8b5cf6;">48 hours</strong>, they discovered:
              </p>
              
              <!-- Results List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #10b981; font-size: 18px; margin-right: 12px;">✓</span>
                    <span style="color: #d1d5db; font-size: 15px;">Three critical assumptions they hadn't questioned</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #10b981; font-size: 18px; margin-right: 12px;">✓</span>
                    <span style="color: #d1d5db; font-size: 15px;">A competitor blind spot that became their differentiation</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #10b981; font-size: 18px; margin-right: 12px;">✓</span>
                    <span style="color: #d1d5db; font-size: 15px;">The exact customer segment most likely to pay</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                They pivoted their approach <strong style="color: #ffffff;">BEFORE</strong> writing a single line of code. Three months later, they launched to their first 50 paying customers.
              </p>
              
              <!-- Testimonial Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); margin: 24px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0; color: #10b981; font-size: 15px; font-style: italic; line-height: 1.6;">
                      "The analysis paid for itself 100x over. I would have wasted months building the wrong thing."
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                You saw the APEX framework in action during the demo. Imagine having that same clarity for <strong style="color: #8b5cf6;">YOUR</strong> idea.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}/#pricing" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Get Your Analysis →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                To your success,<br>
                <strong style="color: #d1d5db;">The Aether Logic Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(139, 92, 246, 0.1);">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                © 2024 Aether Logic. All rights reserved.<br>
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${trackingPixel}
</body>
</html>
    `,
    text: `Quick story for you, ${capitalizedName}:

Last month, a founder came to us with an idea they'd been sitting on for 6 months. They had the skills to build it, but something held them back.

"I kept second-guessing myself. What if I build it and nobody wants it?"

Sound familiar?

They ran their idea through the full APEX analysis. In 48 hours, they discovered:

✓ Three critical assumptions they hadn't questioned
✓ A competitor blind spot that became their differentiation
✓ The exact customer segment most likely to pay

They pivoted their approach BEFORE writing a single line of code. Three months later, they launched to their first 50 paying customers.

"The analysis paid for itself 100x over. I would have wasted months building the wrong thing."

You saw the APEX framework in action during the demo. Imagine having that same clarity for YOUR idea.

Get Your Analysis: ${baseUrl}/#pricing

To your success,
The Aether Logic Team

---
Unsubscribe: ${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}
    `
  };
}

/**
 * Email 3: Problem-Solution Deep Dive
 * Sent 5-7 days after subscription
 */
function getEmail3Template(email: string, subscriberId: number = 0): EmailTemplate {
  const baseUrl = getBaseUrl();
  const firstName = email.split('@')[0].split('.')[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const trackingId = generateEmailTrackingId(subscriberId, 3);
  const trackingPixel = getTrackingPixelHtml(trackingId, baseUrl);
  
  return {
    subject: "The #1 reason startup ideas fail (and how to avoid it)",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Aether Logic
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="margin: 0 0 24px; color: #ffffff; font-size: 22px; font-weight: 600;">
                Hi ${capitalizedName},
              </h2>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                Let me share something that might be uncomfortable to hear:
              </p>
              
              <p style="margin: 0 0 24px; color: #ffffff; font-size: 18px; line-height: 1.7; font-weight: 500;">
                Most startup ideas don't fail because they're bad ideas. They fail because founders build on <span style="color: #ef4444;">assumptions</span> instead of <span style="color: #10b981;">insights</span>.
              </p>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                After analyzing hundreds of startup strategies, I've identified the three most common blind spots:
              </p>
              
              <!-- Blind Spot 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2); margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #ef4444; font-size: 14px; font-weight: 600;">
                      BLIND SPOT #1
                    </p>
                    <p style="margin: 0 0 8px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      The "Everyone" Problem
                    </p>
                    <p style="margin: 0; color: #d1d5db; font-size: 14px; line-height: 1.6;">
                      "Everyone needs this!" is the most dangerous phrase in entrepreneurship. The APEX analysis forces you to define exactly WHO needs this and WHY they'll pay.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Blind Spot 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2); margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #f59e0b; font-size: 14px; font-weight: 600;">
                      BLIND SPOT #2
                    </p>
                    <p style="margin: 0 0 8px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      The Competition Illusion
                    </p>
                    <p style="margin: 0; color: #d1d5db; font-size: 14px; line-height: 1.6;">
                      Founders either ignore competitors ("nobody's doing this!") or obsess over them ("they'll crush us!"). Neither is helpful. Strategic analysis reveals the actual competitive landscape.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Blind Spot 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(139, 92, 246, 0.1); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2); margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #8b5cf6; font-size: 14px; font-weight: 600;">
                      BLIND SPOT #3
                    </p>
                    <p style="margin: 0 0 8px; color: #ffffff; font-size: 16px; font-weight: 600;">
                      The Feature Trap
                    </p>
                    <p style="margin: 0; color: #d1d5db; font-size: 14px; line-height: 1.6;">
                      Building features before validating the core problem. The analysis identifies what to build FIRST for maximum validation.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- What Demo Didn't Show -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(6, 182, 212, 0.1); border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.3); margin: 30px 0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #06b6d4; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      🔒 What the demo didn't show you
                    </p>
                    <p style="margin: 0; color: #d1d5db; font-size: 15px; line-height: 1.6;">
                      The full APEX analysis includes a personalized <strong style="color: #ffffff;">"Assumption Ledger"</strong> that maps every assumption in your idea and ranks them by risk. Most founders discover 5-10 critical assumptions they never consciously identified.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                The demo showed you what strategic analysis <em>looks like</em>.<br>
                The full analysis shows you what it means for <strong style="color: #8b5cf6;">YOUR specific idea</strong>.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${baseUrl}/#pricing" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Get Your Personalized Analysis →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Questions? Just hit reply.<br>
                <strong style="color: #d1d5db;">The Aether Logic Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(139, 92, 246, 0.1);">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                © 2024 Aether Logic. All rights reserved.<br>
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${trackingPixel}
</body>
</html>
    `,
    text: `Hi ${capitalizedName},

Let me share something that might be uncomfortable to hear:

Most startup ideas don't fail because they're bad ideas. They fail because founders build on ASSUMPTIONS instead of INSIGHTS.

After analyzing hundreds of startup strategies, I've identified the three most common blind spots:

BLIND SPOT #1: The "Everyone" Problem
"Everyone needs this!" is the most dangerous phrase in entrepreneurship. The APEX analysis forces you to define exactly WHO needs this and WHY they'll pay.

BLIND SPOT #2: The Competition Illusion
Founders either ignore competitors ("nobody's doing this!") or obsess over them ("they'll crush us!"). Neither is helpful. Strategic analysis reveals the actual competitive landscape.

BLIND SPOT #3: The Feature Trap
Building features before validating the core problem. The analysis identifies what to build FIRST for maximum validation.

🔒 What the demo didn't show you:
The full APEX analysis includes a personalized "Assumption Ledger" that maps every assumption in your idea and ranks them by risk. Most founders discover 5-10 critical assumptions they never consciously identified.

The demo showed you what strategic analysis looks like.
The full analysis shows you what it means for YOUR specific idea.

Get Your Personalized Analysis: ${baseUrl}/#pricing

Questions? Just hit reply.
The Aether Logic Team

---
Unsubscribe: ${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}
    `
  };
}

/**
 * Email 4: Priority Bonus Offer
 * Sent 10-14 days after subscription
 */
function getEmail4Template(email: string, subscriberId: number = 0): EmailTemplate {
  const baseUrl = getBaseUrl();
  const firstName = email.split('@')[0].split('.')[0];
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const trackingId = generateEmailTrackingId(subscriberId, 4);
  const trackingPixel = getTrackingPixelHtml(trackingId, baseUrl);
  
  // Priority link with tracking
  const priorityLink = `${baseUrl}/#pricing?priority=PRIORITY`;
  
  return {
    subject: "Your exclusive priority access expires soon ⏰",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                Aether Logic
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px 40px;">
              <h2 style="margin: 0 0 24px; color: #ffffff; font-size: 22px; font-weight: 600;">
                Hi ${capitalizedName},
              </h2>
              
              <p style="margin: 0 0 20px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                Over the past two weeks, you've:
              </p>
              
              <!-- Recap List -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0 24px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px; margin-right: 12px;">✓</span>
                    <span style="color: #d1d5db; font-size: 15px;">Explored the APEX framework in our demo</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px; margin-right: 12px;">✓</span>
                    <span style="color: #d1d5db; font-size: 15px;">Seen how founders use strategic analysis to validate faster</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px; margin-right: 12px;">✓</span>
                    <span style="color: #d1d5db; font-size: 15px;">Learned about the blind spots that trip up most startups</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #ffffff; font-size: 18px; font-weight: 600;">
                Now it's decision time.
              </p>
              
              <!-- Priority Offer Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.2)); border-radius: 16px; border: 2px solid rgba(139, 92, 246, 0.4); margin: 24px 0;">
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #8b5cf6; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                      🎁 EXCLUSIVE FOR DEMO VIEWERS
                    </p>
                    <p style="margin: 0 0 16px; color: #ffffff; font-size: 24px; font-weight: 700;">
                      Priority Processing
                    </p>
                    <p style="margin: 0 0 20px; color: #d1d5db; font-size: 15px; line-height: 1.6;">
                      Order the <strong style="color: #8b5cf6;">Syndicate tier</strong> through this email and your analysis gets <strong style="color: #ffffff;">priority processing</strong> - delivered before all other orders in the queue.
                    </p>
                    <p style="margin: 0; color: #f59e0b; font-size: 14px; font-weight: 500;">
                      ⏰ This offer expires in 48 hours
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${priorityLink}" style="display: inline-block; padding: 18px 40px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);">
                      Claim Priority Access →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- FAQ Section -->
              <p style="margin: 40px 0 16px; color: #ffffff; font-size: 16px; font-weight: 600;">
                Still have questions?
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
                    <p style="margin: 0 0 8px; color: #8b5cf6; font-size: 14px; font-weight: 600;">
                      Q: "What if my idea isn't fully formed yet?"
                    </p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                      A: Perfect timing. The analysis helps you shape it before you invest in building.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
                    <p style="margin: 0 0 8px; color: #8b5cf6; font-size: 14px; font-weight: 600;">
                      Q: "What if the analysis reveals problems?"
                    </p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                      A: Better to know now than after months of development. Every "problem" is actually a gift.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0;">
                    <p style="margin: 0 0 8px; color: #8b5cf6; font-size: 14px; font-weight: 600;">
                      Q: "Is this worth the investment?"
                    </p>
                    <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.5;">
                      A: Founders tell us it paid for itself 100x over. The cost of building the wrong thing is always higher.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 16px; line-height: 1.7;">
                I'd hate for you to miss out on the clarity this analysis provides.
              </p>
              
              <!-- Secondary CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${priorityLink}" style="display: inline-block; padding: 14px 28px; background: transparent; color: #8b5cf6; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; border: 2px solid #8b5cf6;">
                      Get Started Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                Or hit reply with any questions. I'm here to help.<br><br>
                <strong style="color: #d1d5db;">The Aether Logic Team</strong>
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; font-style: italic;">
                P.S. Even if you're not ready to commit, reply and tell me what's holding you back. I genuinely want to understand.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(139, 92, 246, 0.1);">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                © 2024 Aether Logic. All rights reserved.<br>
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${trackingPixel}
</body>
</html>
    `,
    text: `Hi ${capitalizedName},

Over the past two weeks, you've:

✓ Explored the APEX framework in our demo
✓ Seen how founders use strategic analysis to validate faster
✓ Learned about the blind spots that trip up most startups

Now it's decision time.

🎁 EXCLUSIVE FOR DEMO VIEWERS: Priority Processing

Order the Syndicate tier through this email and your analysis gets priority processing - delivered before all other orders in the queue.

⏰ This offer expires in 48 hours

Claim Priority Access: ${priorityLink}

---

Still have questions?

Q: "What if my idea isn't fully formed yet?"
A: Perfect timing. The analysis helps you shape it before you invest in building.

Q: "What if the analysis reveals problems?"
A: Better to know now than after months of development. Every "problem" is actually a gift.

Q: "Is this worth the investment?"
A: Founders tell us it paid for itself 100x over. The cost of building the wrong thing is always higher.

---

I'd hate for you to miss out on the clarity this analysis provides.

Get Started Now: ${priorityLink}

Or hit reply with any questions. I'm here to help.

The Aether Logic Team

P.S. Even if you're not ready to commit, reply and tell me what's holding you back. I genuinely want to understand.

---
Unsubscribe: ${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}
    `
  };
}

/**
 * Send email via Resend API
 */
async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "hello@aetherlogic.io";
  
  if (!apiKey) {
    console.error("[EmailNurturing] RESEND_API_KEY not configured");
    return false;
  }
  
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Aether Logic <${fromEmail}>`,
        to: [to],
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[EmailNurturing] Failed to send email to ${to}:`, error);
      return false;
    }
    
    console.log(`[EmailNurturing] Successfully sent email to ${to}: ${template.subject}`);
    return true;
  } catch (error) {
    console.error(`[EmailNurturing] Error sending email to ${to}:`, error);
    return false;
  }
}

/**
 * Send Email 1 (Welcome) immediately after subscription
 */
export async function sendWelcomeEmail(subscriberId: number, email: string): Promise<boolean> {
  const template = getEmail1Template(email, subscriberId);
  const success = await sendEmail(email, template);
  
  if (success) {
    // Create sequence status record
    const db = await getDb();
    if (db) {
      await db.insert(emailSequenceStatus).values({
        subscriberId,
        email,
        email1SentAt: new Date(),
      });
    }
  }
  
  return success;
}

/**
 * Process email sequence for all subscribers
 * This should be called periodically (e.g., every hour via cron)
 */
export async function processEmailSequence(): Promise<{ sent: number; errors: number }> {
  const now = new Date();
  let sent = 0;
  let errors = 0;
  
  // Get all active subscribers with their sequence status
  const db = await getDb();
  if (!db) {
    console.error("[EmailNurturing] Database not available");
    return { sent: 0, errors: 0 };
  }
  const subscribers = await db
    .select()
    .from(emailSubscribers)
    .leftJoin(emailSequenceStatus, eq(emailSubscribers.id, emailSequenceStatus.subscriberId))
    .where(eq(emailSubscribers.isActive, true));
  
  for (const row of subscribers) {
    const subscriber = row.email_subscribers;
    const status = row.email_sequence_status;
    
    // Skip if unsubscribed
    if (status?.unsubscribedAt) continue;
    
    const subscribedAt = subscriber.subscribedAt;
    const daysSinceSubscription = Math.floor((now.getTime() - subscribedAt.getTime()) / (1000 * 60 * 60 * 24));
    
    try {
      // Email 1: Immediate (if not sent yet)
      if (!status) {
        const template = getEmail1Template(subscriber.email, subscriber.id);
        if (await sendEmail(subscriber.email, template)) {
          await db.insert(emailSequenceStatus).values({
            subscriberId: subscriber.id,
            email: subscriber.email,
            email1SentAt: now,
          } as any);
          sent++;
        } else {
          errors++;
        }
        continue;
      }
      
      // Email 2: Day 2-3 (if email 1 sent and email 2 not sent)
      if (status.email1SentAt && !status.email2SentAt && daysSinceSubscription >= 2) {
        const template = getEmail2Template(subscriber.email, subscriber.id);
        if (await sendEmail(subscriber.email, template)) {
          await db.update(emailSequenceStatus)
            .set({ email2SentAt: now })
            .where(eq(emailSequenceStatus.id, status.id!));
          sent++;
        } else {
          errors++;
        }
        continue;
      }
      
      // Email 3: Day 5-7 (if email 2 sent and email 3 not sent)
      if (status.email2SentAt && !status.email3SentAt && daysSinceSubscription >= 5) {
        const template = getEmail3Template(subscriber.email, subscriber.id);
        if (await sendEmail(subscriber.email, template)) {
          await db.update(emailSequenceStatus)
            .set({ email3SentAt: now })
            .where(eq(emailSequenceStatus.id, status.id!));
          sent++;
        } else {
          errors++;
        }
        continue;
      }
      
      // Email 4: Day 10-14 (if email 3 sent and email 4 not sent)
      if (status.email3SentAt && !status.email4SentAt && daysSinceSubscription >= 10) {
        const template = getEmail4Template(subscriber.email, subscriber.id);
        if (await sendEmail(subscriber.email, template)) {
          await db.update(emailSequenceStatus)
            .set({ email4SentAt: now })
            .where(eq(emailSequenceStatus.id, status.id!));
          sent++;
        } else {
          errors++;
        }
        continue;
      }
    } catch (error) {
      console.error(`[EmailNurturing] Error processing subscriber ${subscriber.id}:`, error);
      errors++;
    }
  }
  
  console.log(`[EmailNurturing] Processed sequence: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}

/**
 * Get email templates for preview/testing
 */
export function getEmailTemplates() {
  const testEmail = "test@example.com";
  return {
    email1: getEmail1Template(testEmail),
    email2: getEmail2Template(testEmail),
    email3: getEmail3Template(testEmail),
    email4: getEmail4Template(testEmail),
  };
}
