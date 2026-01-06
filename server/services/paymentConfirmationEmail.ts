// ===========================================
// PAYMENT CONFIRMATION EMAIL
// Sent immediately after successful payment
// ===========================================

/**
 * Check if email service is configured
 */
function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

interface PaymentConfirmationParams {
  to: string;
  userName: string;
  tier: string;
  amount: string;
  currency: string;
  transactionId: string;
  problemStatement: string;
  estimatedTime: string;
  trackingUrl: string;
}

const TIER_INFO: Record<string, { name: string; emoji: string; features: string[] }> = {
  standard: {
    name: "Observer",
    emoji: "👁️",
    features: ["Core UX Analysis", "Problem Validation", "Basic Recommendations"]
  },
  medium: {
    name: "Insider", 
    emoji: "🔮",
    features: ["Deep UX Analysis", "Competitive Insights", "Strategic Roadmap", "Priority Support"]
  },
  full: {
    name: "Syndicate",
    emoji: "⚡",
    features: [
      "APEX 6-Part Strategic Analysis",
      "\"War Room\" Competitor Simulation (Live counter-moves)",
      "\"Fake Door\" Demand Validation Strategy",
      "Dynamic Unit Economics & Pre-Mortem Analysis",
      "10 Production-Ready Figma Prompts",
      "Full Tech Stack Architecture & Go-to-Market Plan"
    ]
  }
};

/**
 * Send payment confirmation email immediately after successful payment
 */
export async function sendPaymentConfirmationEmail(params: PaymentConfirmationParams): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.error('[PaymentEmail] RESEND_API_KEY not configured');
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const tierInfo = TIER_INFO[params.tier] || TIER_INFO.standard;
  
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const featuresHtml = tierInfo.features.map(f => 
    `<li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
      <span style="color: #10b981; margin-right: 8px;">✓</span> ${f}
    </li>`
  ).join('');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `ValidateStrategy <${fromEmail}>`,
        to: [params.to],
        subject: `✅ Payment Confirmed - Your ${tierInfo.name} Analysis Has Started!`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e5e7eb;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #0f0f1a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td>
                            <!-- HEADER -->
                            <div style="text-align: center; padding: 30px 0;">
                                <span style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px;">⚡ VALIDATESTRATEGY</span>
                            </div>

                            <!-- MAIN CARD -->
                            <div style="background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border: 1px solid #2d2d4a; border-radius: 16px; overflow: hidden;">
                                
                                <!-- SUCCESS BANNER -->
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                                    <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
                                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Payment Successful!</h1>
                                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Your analysis is now being generated</p>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 30px;">
                                    
                                    <p style="color: #9ca3af; margin: 0 0 20px;">Hi <strong style="color: #e5e7eb;">${params.userName}</strong>,</p>
                                    
                                    <p style="color: #9ca3af; margin: 0 0 25px; line-height: 1.6;">
                                        Thank you for your purchase! Your <strong style="color: #818cf8;">${tierInfo.name} ${tierInfo.emoji}</strong> analysis has started processing. 
                                        You'll receive another email with your results when it's ready.
                                    </p>

                                    <!-- TRACKING BUTTON -->
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${params.trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Track Your Analysis →
                                        </a>
                                    </div>

                                    <!-- ESTIMATED TIME -->
                                    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
                                        <div style="color: #818cf8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Estimated Completion</div>
                                        <div style="color: #e5e7eb; font-size: 24px; font-weight: 700;">${params.estimatedTime}</div>
                                    </div>

                                    <!-- PROBLEM STATEMENT -->
                                    <div style="background: #0f0f1a; border: 1px solid #2d2d4a; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Your Problem Statement</div>
                                        <p style="color: #9ca3af; margin: 0; font-style: italic; line-height: 1.6;">"${params.problemStatement.substring(0, 200)}${params.problemStatement.length > 200 ? '...' : ''}"</p>
                                    </div>

                                    <!-- WHAT'S INCLUDED -->
                                    <div style="margin-bottom: 25px;">
                                        <div style="color: #e5e7eb; font-size: 14px; font-weight: 600; margin-bottom: 15px;">What's Included in Your ${tierInfo.name} Package:</div>
                                        <ul style="list-style: none; padding: 0; margin: 0; background: #0f0f1a; border: 1px solid #2d2d4a; border-radius: 12px; overflow: hidden;">
                                            ${featuresHtml}
                                        </ul>
                                    </div>

                                    <!-- RECEIPT -->
                                    <div style="border-top: 1px solid #2d2d4a; padding-top: 25px;">
                                        <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">Receipt</div>
                                        <table style="width: 100%;" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="color: #9ca3af; padding: 8px 0;">Transaction ID</td>
                                                <td style="color: #e5e7eb; text-align: right; font-family: monospace; font-size: 12px;">${params.transactionId}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; padding: 8px 0;">Date</td>
                                                <td style="color: #e5e7eb; text-align: right;">${date}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #9ca3af; padding: 8px 0;">Package</td>
                                                <td style="color: #e5e7eb; text-align: right;">${tierInfo.name} ${tierInfo.emoji}</td>
                                            </tr>
                                            <tr style="border-top: 1px solid #2d2d4a;">
                                                <td style="color: #10b981; padding: 15px 0 0; font-size: 18px; font-weight: 700;">Total Paid</td>
                                                <td style="color: #10b981; text-align: right; padding: 15px 0 0; font-size: 18px; font-weight: 700;">${params.amount} ${params.currency}</td>
                                            </tr>
                                        </table>
                                    </div>

                                </div>
                            </div>

                            <!-- FOOTER -->
                            <div style="text-align: center; padding: 30px 0;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                                    Questions? Reply to this email or contact <a href="mailto:support@validatestrategy.com" style="color: #818cf8;">support@validatestrategy.com</a>
                                </p>
                                <p style="color: #4b5563; font-size: 11px; margin: 15px 0 0;">
                                    © ${new Date().getFullYear()} ValidateStrategy. All rights reserved.
                                </p>
                            </div>

                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
        text: `Payment Confirmed!

Hi ${params.userName},

Thank you for your purchase! Your ${tierInfo.name} analysis has started processing.

Track your analysis: ${params.trackingUrl}

Estimated Completion: ${params.estimatedTime}

Your Problem Statement:
"${params.problemStatement.substring(0, 200)}${params.problemStatement.length > 200 ? '...' : ''}"

Receipt:
- Transaction ID: ${params.transactionId}
- Date: ${date}
- Package: ${tierInfo.name}
- Total Paid: ${params.amount} ${params.currency}

Questions? Contact support@validatestrategy.com

© ${new Date().getFullYear()} ValidateStrategy. All rights reserved.
`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[PaymentEmail] Failed to send:', errorData);
      return false;
    }

    console.log('[PaymentEmail] Payment confirmation sent to:', params.to);
    return true;

  } catch (error) {
    console.error('[PaymentEmail] Error:', error);
    return false;
  }
}

/**
 * Send progress update email during long analyses
 */
export async function sendProgressUpdateEmail(params: {
  to: string;
  userName: string;
  currentPart: number;
  totalParts: number;
  partName: string;
  trackingUrl: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) {
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const progressPercent = Math.round((params.currentPart / params.totalParts) * 100);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `ValidateStrategy <${fromEmail}>`,
        to: [params.to],
        subject: `📊 Analysis Progress: ${progressPercent}% Complete`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 40px 20px; background: #0f0f1a; font-family: system-ui, sans-serif; color: #e5e7eb;">
    <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border: 1px solid #2d2d4a; border-radius: 16px; padding: 30px; text-align: center;">
        <h2 style="color: #818cf8; margin: 0 0 20px;">Analysis in Progress</h2>
        
        <!-- Progress Bar -->
        <div style="background: #0f0f1a; border-radius: 8px; height: 12px; margin: 20px 0; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #6366f1, #8b5cf6); height: 100%; width: ${progressPercent}%; border-radius: 8px;"></div>
        </div>
        
        <p style="color: #9ca3af; margin: 0 0 10px;">Part ${params.currentPart} of ${params.totalParts} completed</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 25px;">Currently processing: <strong style="color: #e5e7eb;">${params.partName}</strong></p>
        
        <a href="${params.trackingUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Live Progress</a>
    </div>
</body>
</html>`,
        text: `Analysis Progress: ${progressPercent}% Complete

Part ${params.currentPart} of ${params.totalParts} completed.
Currently processing: ${params.partName}

View live progress: ${params.trackingUrl}
`
      })
    });

    return response.ok;
  } catch {
    return false;
  }
}
