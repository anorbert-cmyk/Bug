/**
 * reCAPTCHA v3 Service
 * Server-side verification of reCAPTCHA tokens
 */

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

interface RecaptchaVerifyResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  "error-codes"?: string[];
}

/**
 * Check if reCAPTCHA is configured
 */
export function isRecaptchaConfigured(): boolean {
  return !!(process.env.RECAPTCHA_SECRET_KEY && process.env.VITE_RECAPTCHA_SITE_KEY);
}

/**
 * Get reCAPTCHA site key for frontend
 */
export function getRecaptchaSiteKey(): string | null {
  return process.env.VITE_RECAPTCHA_SITE_KEY || null;
}

/**
 * Verify reCAPTCHA token
 * @param token - The reCAPTCHA token from frontend
 * @param expectedAction - The expected action name (e.g., "email_subscribe", "checkout")
 * @param minScore - Minimum score threshold (0.0 to 1.0, default 0.5)
 * @returns Verification result with score
 */
export async function verifyRecaptcha(
  token: string,
  expectedAction?: string,
  minScore: number = 0.5
): Promise<{ success: boolean; score: number; error?: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn("[reCAPTCHA] Secret key not configured, skipping verification");
    return { success: true, score: 1.0 }; // Allow if not configured
  }

  if (!token) {
    return { success: false, score: 0, error: "Missing reCAPTCHA token" };
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    if (!response.ok) {
      console.error("[reCAPTCHA] API request failed:", response.status);
      return { success: false, score: 0, error: "reCAPTCHA verification failed" };
    }

    const data: RecaptchaVerifyResponse = await response.json();

    if (!data.success) {
      console.warn("[reCAPTCHA] Verification failed:", data["error-codes"]);
      return { 
        success: false, 
        score: 0, 
        error: data["error-codes"]?.join(", ") || "Verification failed" 
      };
    }

    // Check action if specified
    if (expectedAction && data.action !== expectedAction) {
      console.warn(`[reCAPTCHA] Action mismatch: expected ${expectedAction}, got ${data.action}`);
      return { 
        success: false, 
        score: data.score, 
        error: "Action mismatch" 
      };
    }

    // Check score threshold
    if (data.score < minScore) {
      console.warn(`[reCAPTCHA] Score too low: ${data.score} < ${minScore}`);
      return { 
        success: false, 
        score: data.score, 
        error: `Score too low (${data.score})` 
      };
    }

    console.log(`[reCAPTCHA] Verification successful: score=${data.score}, action=${data.action}`);
    return { success: true, score: data.score };

  } catch (error) {
    console.error("[reCAPTCHA] Verification error:", error);
    return { success: false, score: 0, error: "Verification request failed" };
  }
}
