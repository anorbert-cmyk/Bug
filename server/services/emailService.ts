// ===========================================
// EMAIL SERVICE - Resend Integration
// ===========================================

// Resend API client (lazy loaded)
let resendApiKey: string | null = null;

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get Resend API key
 */
function getResendApiKey(): string | null {
  if (!resendApiKey) {
    resendApiKey = process.env.RESEND_API_KEY || null;
  }
  return resendApiKey;
}

// ===========================================
// VALIDATESTRATEGY PAYMENT SUCCESS EMAIL
// ===========================================

interface ValidateStrategyEmailParams {
  to: string;
  userName: string;
  magicLinkUrl: string;
  transactionId: string;
  amount: string;
  currency?: string;
  tier?: string;
}

/**
 * Send ValidateStrategy payment success email with Hungarian template
 */
export async function sendValidateStrategyEmail(params: ValidateStrategyEmailParams): Promise<boolean> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not configured');
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const date = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Tier names for display
  const tierNames: Record<string, string> = {
    'standard': 'Observer Elemzés',
    'medium': 'Insider Elemzés',
    'full': 'Syndicate Elemzés'
  };
  const tierName = params.tier ? tierNames[params.tier] || 'Prémium Elemzés' : 'Prémium Elemzés';

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
        subject: '🚀 Fizetés elfogadva - Elemzésed elkészült!',
        html: `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sikeres Fizetés</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.6; color: #374151;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td>
                            <!-- MAIN CARD START -->
                            <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
                                
                                <!-- HEADER WITH GRADIENT -->
                                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
                                    <a href="#" style="font-size: 28px; font-weight: 800; color: #ffffff; text-decoration: none; letter-spacing: -0.5px;">
                                        <img src="https://img.icons8.com/fluency-systems-filled/96/ffffff/rocket.png" width="32" height="32" style="vertical-align: middle; margin-right: 8px;" alt="Logo"/>
                                        ValidateStrategy
                                    </a>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 40px 30px; text-align: center;">
                                    
                                    <!-- SUCCESS ICON -->
                                    <div style="margin-bottom: 25px;">
                                        <img src="https://img.icons8.com/clouds/200/000000/checked.png" width="100" alt="Siker" />
                                    </div>

                                    <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 15px; letter-spacing: -0.5px;">Fizetés elfogadva!</h1>
                                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px;">Szia <strong>${params.userName}</strong>! A tranzakció sikeres volt. A rendszereink legenerálták az elemzést, ami már készen áll a megtekintésre.</p>

                                    <!-- MAGIC BUTTON -->
                                    <div style="margin: 30px 0;">
                                        <a href="${params.magicLinkUrl}" target="_blank" style="background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%); border-radius: 50px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 280px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);">
                                            Elemzés Megnyitása &rarr;
                                        </a>
                                    </div>
                                    
                                    <p style="font-size: 13px; color: #9ca3af;">
                                        A link soha nem jár le. Ha nem működik, másold be a böngészőbe:<br>
                                        <span style="color: #4f46e5; word-break: break-all;">${params.magicLinkUrl}</span>
                                    </p>

                                    <!-- RECEIPT BLOCK -->
                                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-top: 30px; text-align: left;">
                                        <div style="font-size: 12px; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px; font-weight: 700; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Tranzakció Részletei</div>
                                        <table style="width: 100%;" role="presentation" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">Tétel</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace; color: #111827;">${tierName}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">Tranzakció ID</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace; color: #111827; font-size: 12px;">${params.transactionId.length > 20 ? params.transactionId.substring(0, 20) + '...' : params.transactionId}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #374151; font-size: 15px; font-weight: 500;">Dátum</td>
                                                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace; color: #111827;">${date}</td>
                                            </tr>
                                            <tr>
                                                <td style="border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 18px; font-weight: 800; color: #4f46e5;">Összesen</td>
                                                <td style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: right; font-size: 18px; font-weight: 800; color: #4f46e5;">${params.amount} ${params.currency || 'USD'}</td>
                                            </tr>
                                        </table>
                                    </div>

                                </div>
                            </div>
                            <!-- MAIN CARD END -->

                            <!-- FOOTER -->
                            <div style="margin-top: 30px; text-align: center;">
                                <p style="color: #9ca3af; font-size: 13px;">
                                    ValidateStrategy Inc. &bull; Budapest<br>
                                    Ez egy automatikus üzenet. <a href="mailto:support@validatestrategy.com" style="color: #6b7280; text-decoration: underline;">Segítség</a>
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
        text: `Fizetés elfogadva!

Szia ${params.userName}! A tranzakció sikeres volt. A rendszereink legenerálták az elemzést, ami már készen áll a megtekintésre.

Elemzés megnyitása: ${params.magicLinkUrl}

Tranzakció Részletei:
- Tétel: ${tierName}
- Tranzakció ID: ${params.transactionId}
- Dátum: ${date}
- Összesen: ${params.amount} ${params.currency || 'USD'}

A link soha nem jár le.

© ValidateStrategy Inc. - Budapest
`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Email] Failed to send email:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('[Email] ValidateStrategy email sent successfully', { to: params.to, emailId: data?.id });
    return true;

  } catch (error) {
    console.error('[Email] ValidateStrategy email sending failed', error);
    return false;
  }
}

// ===========================================
// ANALYSIS READY EMAIL (English version)
// ===========================================

import { getTierEmailConfig, generateTierEmailHTML, generateTierEmailText } from './tierEmailTemplates';

interface AnalysisReadyEmailParams {
  to: string;
  magicLink: string;
  tier: string;
  problemSummary: string;
  userName?: string;
}

/**
 * Send tier-specific analysis ready email
 * Uses unique templates for Observer, Insider, and Syndicate tiers
 */
export async function sendAnalysisReadyEmail(params: AnalysisReadyEmailParams): Promise<boolean> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not configured');
    return false;
  }

  // Get tier-specific email configuration
  const tierConfig = getTierEmailConfig(params.tier);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  // Generate tier-specific email content
  const htmlContent = generateTierEmailHTML(tierConfig, {
    magicLink: params.magicLink,
    problemSummary: params.problemSummary,
    userName: params.userName,
  });

  const textContent = generateTierEmailText(tierConfig, {
    magicLink: params.magicLink,
    problemSummary: params.problemSummary,
    userName: params.userName,
  });

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
        subject: `⚡ ${tierConfig.headline}`,
        html: htmlContent,
        text: textContent,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Email] Failed to send analysis ready email:', errorData);
      return false;
    }

    const data = await response.json();
    console.log(`[Email] ${tierConfig.tierName} tier analysis email sent successfully`, { 
      to: params.to, 
      tier: params.tier,
      emailId: data?.id 
    });
    return true;

  } catch (error) {
    console.error('[Email] Analysis ready email sending failed', error);
    return false;
  }
}


// ===========================================
// EMAIL VERIFICATION (Double Opt-in)
// ===========================================

interface VerificationEmailParams {
  to: string;
  verificationUrl: string;
}

/**
 * Send email verification link for double opt-in
 */
export async function sendVerificationEmail(params: VerificationEmailParams): Promise<boolean> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY not configured');
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

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
        subject: '🔐 Confirm your email to unlock the full demo',
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; font-size: 16px; line-height: 1.6; color: #e0e0e0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #0f0f1a; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td>
                            <!-- MAIN CARD -->
                            <div style="background: linear-gradient(145deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; border: 1px solid rgba(99, 102, 241, 0.2); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); overflow: hidden;">
                                
                                <!-- HEADER -->
                                <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); padding: 30px; text-align: center; border-bottom: 1px solid rgba(99, 102, 241, 0.2);">
                                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                                        ⚡ ValidateStrategy
                                    </div>
                                    <div style="font-size: 12px; color: #6366f1; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">
                                        AI Strategic Analysis
                                    </div>
                                </div>

                                <!-- CONTENT -->
                                <div style="padding: 40px 30px; text-align: center;">
                                    
                                    <!-- LOCK ICON -->
                                    <div style="margin-bottom: 25px;">
                                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                                            <span style="font-size: 36px;">🔐</span>
                                        </div>
                                    </div>

                                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 15px; letter-spacing: -0.5px;">One click to unlock</h1>
                                    <p style="margin: 0 0 30px; color: #a0a0b0; font-size: 16px;">Click the button below to verify your email and unlock the full APEX demo analysis with 10 production-ready Figma prompts.</p>

                                    <!-- VERIFY BUTTON -->
                                    <div style="margin: 30px 0;">
                                        <a href="${params.verificationUrl}" target="_blank" style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; line-height: 54px; text-align: center; text-decoration: none; width: 260px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                                            Verify Email →
                                        </a>
                                    </div>
                                    
                                    <p style="font-size: 13px; color: #6b6b80; margin-top: 20px;">
                                        This link expires in 24 hours.<br>
                                        If the button doesn't work, copy this URL:<br>
                                        <span style="color: #6366f1; word-break: break-all; font-size: 11px;">${params.verificationUrl}</span>
                                    </p>

                                    <!-- WHAT YOU GET -->
                                    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 20px; margin-top: 30px; text-align: left;">
                                        <div style="font-size: 12px; text-transform: uppercase; color: #6366f1; letter-spacing: 1px; font-weight: 700; margin-bottom: 15px;">What you'll unlock:</div>
                                        <div style="color: #e0e0e0; font-size: 14px;">
                                            ✓ Full 6-part APEX strategic analysis<br>
                                            ✓ 10 production-ready Figma prompts<br>
                                            ✓ Risk assessment & success metrics<br>
                                            ✓ Export to Markdown
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <!-- FOOTER -->
                            <div style="margin-top: 30px; text-align: center;">
                                <p style="color: #6b6b80; font-size: 12px;">
                                    © ValidateStrategy • AI-Powered Strategic Analysis<br>
                                    <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a>
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
        text: `Verify your email to unlock the full demo

Click the link below to verify your email and unlock the full APEX demo analysis with 10 production-ready Figma prompts.

Verify Email: ${params.verificationUrl}

This link expires in 24 hours.

What you'll unlock:
- Full 6-part APEX strategic analysis
- 10 production-ready Figma prompts
- Risk assessment & success metrics
- Export to Markdown

© ValidateStrategy - AI-Powered Strategic Analysis
`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Email] Failed to send verification email:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('[Email] Verification email sent successfully', { to: params.to, emailId: data?.id });
    return true;

  } catch (error) {
    console.error('[Email] Verification email sending failed', error);
    return false;
  }
}
