/**
 * Tier-Specific Email Templates
 * Unique value propositions and content for Observer, Insider, and Syndicate tiers
 */

export interface TierEmailConfig {
  tierName: string;
  tierBadge: string;
  headline: string;
  subheadline: string;
  valueProps: string[];
  ctaText: string;
  deliveryTime: string;
  accentColor: string;
  gradientStart: string;
  gradientEnd: string;
  upgradeMessage?: string;
  nextTier?: string;
}

export const TIER_EMAIL_CONFIGS: Record<string, TierEmailConfig> = {
  standard: {
    tierName: "Observer",
    tierBadge: "QUICK VALIDATION",
    headline: "Your Quick Validation is Ready!",
    subheadline: "Get your GO/NO-GO decision and start taking action today.",
    valueProps: [
      "✅ Problem-Market Fit Analysis",
      "✅ Top 5 User Pain Points Identified",
      "✅ Clear GO/NO-GO Recommendation",
      "✅ 3 Immediate Action Items",
    ],
    ctaText: "View My Validation →",
    deliveryTime: "Within 24 Hours",
    accentColor: "#10b981", // Emerald
    gradientStart: "#064e3b",
    gradientEnd: "#065f46",
    upgradeMessage: "Want a detailed roadmap? Upgrade to Insider for strategic planning.",
    nextTier: "Insider",
  },
  medium: {
    tierName: "Insider",
    tierBadge: "STRATEGIC BLUEPRINT",
    headline: "Your Strategic Blueprint is Ready!",
    subheadline: "Your 90-day roadmap with competitor analysis and risk mitigation.",
    valueProps: [
      "✅ Full Discovery & Problem Analysis",
      "✅ 3-5 Competitor Deep Dive",
      "✅ Week-by-Week Action Plan",
      "✅ 5 Critical Risk Mitigations",
      "✅ Team Collaboration Model",
    ],
    ctaText: "View My Blueprint →",
    deliveryTime: "1-2 Hours",
    accentColor: "#8b5cf6", // Violet
    gradientStart: "#4c1d95",
    gradientEnd: "#5b21b6",
    upgradeMessage: "Ready to design? Upgrade to Syndicate for 10 production-ready design prompts.",
    nextTier: "Syndicate",
  },
  full: {
    tierName: "Syndicate",
    tierBadge: "APEX • STATE-OF-THE-ART AI",
    headline: "Your Complete APEX Analysis is Ready!",
    subheadline: "6-part strategic analysis with 10 production-ready design prompts.",
    valueProps: [
      "✅ 6-Part Comprehensive Analysis",
      "✅ AI-Enhanced Execution Toolkit",
      "✅ 10 Production-Ready Design Prompts",
      "✅ Copy-Paste into Any Design Tool",
      "✅ Full Risk Matrix & Metrics Dashboard",
      "✅ Business OKR Alignment",
    ],
    ctaText: "View My APEX Analysis →",
    deliveryTime: "Priority",
    accentColor: "#f59e0b", // Amber
    gradientStart: "#78350f",
    gradientEnd: "#92400e",
  },
};

/**
 * Generate tier-specific HTML email template
 */
export function generateTierEmailHTML(
  config: TierEmailConfig,
  params: {
    magicLink: string;
    problemSummary: string;
    userName?: string;
  }
): string {
  const { tierName, tierBadge, headline, subheadline, valueProps, ctaText, deliveryTime, accentColor, gradientStart, gradientEnd, upgradeMessage, nextTier } = config;
  const year = new Date().getFullYear();
  
  const valuePropsHTML = valueProps.map(prop => 
    `<tr><td style="padding: 8px 0; font-size: 15px; color: #e2e8f0;">${prop}</td></tr>`
  ).join("");

  const upgradeSection = upgradeMessage && nextTier ? `
    <tr>
      <td style="padding: 25px 30px; background: rgba(255,255,255,0.03); border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0; font-size: 14px; color: #94a3b8; text-align: center;">
          💡 ${upgradeMessage}
          <br><br>
          <a href="https://validatestrategy.com/#pricing" style="color: ${accentColor}; text-decoration: underline;">
            Learn about ${nextTier} →
          </a>
        </p>
      </td>
    </tr>
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f0f0f;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; padding: 30px 40px;">
                            <h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: 700;">
                                ⚡ ValidateStrategy
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td>
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%); border-radius: 16px; overflow: hidden;">
                                
                                <!-- Badge -->
                                <tr>
                                    <td style="padding: 25px 30px 0 30px; text-align: center;">
                                        <span style="display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.15); border-radius: 20px; font-size: 11px; font-weight: 700; color: ${accentColor}; letter-spacing: 1px; text-transform: uppercase;">
                                            ${tierBadge}
                                        </span>
                                    </td>
                                </tr>
                                
                                <!-- Headline -->
                                <tr>
                                    <td style="padding: 20px 30px 10px 30px; text-align: center;">
                                        <h2 style="margin: 0; font-size: 26px; color: #ffffff; font-weight: 700; line-height: 1.3;">
                                            ${headline}
                                        </h2>
                                    </td>
                                </tr>
                                
                                <!-- Subheadline -->
                                <tr>
                                    <td style="padding: 0 30px 25px 30px; text-align: center;">
                                        <p style="margin: 0; font-size: 16px; color: #cbd5e1; line-height: 1.5;">
                                            ${subheadline}
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Problem Summary -->
                                <tr>
                                    <td style="padding: 0 30px 25px 30px;">
                                        <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 20px; border-left: 4px solid ${accentColor};">
                                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                                Your Problem Statement
                                            </p>
                                            <p style="margin: 0; font-size: 15px; color: #e2e8f0; line-height: 1.5; font-style: italic;">
                                                "${params.problemSummary.substring(0, 200)}${params.problemSummary.length > 200 ? '...' : ''}"
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Value Props -->
                                <tr>
                                    <td style="padding: 0 30px 25px 30px;">
                                        <p style="margin: 0 0 15px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                            What's Included
                                        </p>
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            ${valuePropsHTML}
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- CTA Button -->
                                <tr>
                                    <td style="padding: 0 30px 30px 30px; text-align: center;">
                                        <a href="${params.magicLink}" 
                                           style="display: inline-block; padding: 18px 48px; background: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                                            ${ctaText}
                                        </a>
                                    </td>
                                </tr>
                                
                                <!-- Delivery Badge -->
                                <tr>
                                    <td style="padding: 0 30px 25px 30px; text-align: center;">
                                        <span style="display: inline-block; padding: 8px 16px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 13px; color: #94a3b8;">
                                            ⚡ Delivery: <strong style="color: #ffffff;">${deliveryTime}</strong>
                                        </span>
                                    </td>
                                </tr>
                                
                                <!-- Upgrade Section -->
                                ${upgradeSection}
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Link Fallback -->
                    <tr>
                        <td style="padding: 25px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 13px; color: #64748b;">
                                This link is unique to you and never expires.<br>
                                <span style="color: #475569; word-break: break-all; font-size: 11px;">
                                    ${params.magicLink}
                                </span>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px 40px 30px; text-align: center;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #475569;">
                                If you didn't make this purchase, please ignore this email.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #475569;">
                                © ${year} ValidateStrategy. All rights reserved.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Generate tier-specific plain text email
 */
export function generateTierEmailText(
  config: TierEmailConfig,
  params: {
    magicLink: string;
    problemSummary: string;
    userName?: string;
  }
): string {
  const { tierName, tierBadge, headline, subheadline, valueProps, deliveryTime, upgradeMessage, nextTier } = config;
  const year = new Date().getFullYear();
  
  const valuePropsText = valueProps.join("\n");
  
  let upgradeText = "";
  if (upgradeMessage && nextTier) {
    upgradeText = `\n---\n💡 ${upgradeMessage}\nLearn more: https://validatestrategy.com/#pricing\n`;
  }

  return `${tierBadge}

${headline}

${subheadline}

---

YOUR PROBLEM STATEMENT:
"${params.problemSummary.substring(0, 200)}${params.problemSummary.length > 200 ? '...' : ''}"

---

WHAT'S INCLUDED:
${valuePropsText}

---

⚡ Delivery: ${deliveryTime}

Click here to view your ${tierName} analysis:
${params.magicLink}

This link is unique to you and never expires.
${upgradeText}
---

If you didn't make this purchase, please ignore this email.

© ${year} ValidateStrategy. All rights reserved.
`;
}

/**
 * Get email configuration for a tier
 */
export function getTierEmailConfig(tier: string): TierEmailConfig {
  return TIER_EMAIL_CONFIGS[tier] || TIER_EMAIL_CONFIGS.full;
}
