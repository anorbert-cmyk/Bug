/**
 * Wallet Authentication Service
 * Handles MetaMask signature verification for admin access
 * 
 * SECURITY: Uses database-backed challenge storage to prevent:
 * - DoS attacks via memory exhaustion
 * - Horizontal scaling issues
 */

import { verifyMessage } from "ethers";
import { 
  isAdminWallet, 
  isSignatureUsed, 
  markSignatureUsed,
  storeChallenge,
  getChallenge,
  deleteChallenge,
  cleanupExpiredChallengesDb
} from "../db";

const SIGNATURE_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes for better UX

export interface WalletAuthResult {
  success: boolean;
  isAdmin: boolean;
  error?: string;
}

/**
 * Generate a challenge for wallet authentication
 * Stores challenge in database instead of in-memory Map
 */
export async function generateChallenge(walletAddress: string): Promise<{ challenge: string; timestamp: number }> {
  const challenge = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  const expiresAt = timestamp + SIGNATURE_VALIDITY_MS;
  
  // Store challenge in database (DoS-resistant)
  await storeChallenge(walletAddress.toLowerCase(), challenge, timestamp, expiresAt);
  
  // Clean up old challenges periodically (async, non-blocking)
  cleanupExpiredChallengesDb().catch(err => 
    console.warn("[WalletAuth] Failed to cleanup expired challenges:", err)
  );
  
  return { challenge, timestamp };
}

/**
 * Generate the message to be signed by the wallet
 * Must match exactly what the frontend generates
 */
export function generateAuthMessage(challenge: string, timestamp: number): string {
  return `Rapid Apollo Admin Login\n\nChallenge: ${challenge}\nTimestamp: ${timestamp}\n\nSign this message to authenticate.`;
}

/**
 * Verify admin wallet signature with challenge
 * Includes replay attack prevention
 */
export async function verifyAdminSignatureWithChallenge(
  signature: string,
  challenge: string,
  timestamp: number,
  claimedAddress: string
): Promise<WalletAuthResult> {
  try {
    const normalizedAddress = claimedAddress.toLowerCase();
    
    // Check if we have a stored challenge for this address (from database)
    const storedChallenge = await getChallenge(normalizedAddress);
    if (!storedChallenge) {
      return {
        success: false,
        isAdmin: false,
        error: "No challenge found. Please request a new challenge.",
      };
    }
    
    // Verify challenge matches
    if (storedChallenge.challenge !== challenge || storedChallenge.timestamp !== timestamp) {
      return {
        success: false,
        isAdmin: false,
        error: "Invalid challenge. Please request a new challenge.",
      };
    }
    
    // Check timestamp validity
    const now = Date.now();
    if (now > storedChallenge.expiresAt) {
      await deleteChallenge(normalizedAddress);
      return {
        success: false,
        isAdmin: false,
        error: "Challenge expired. Please request a new challenge.",
      };
    }

    // Verify the signature
    const message = generateAuthMessage(challenge, timestamp);
    let recoveredAddress: string;
    
    try {
      recoveredAddress = verifyMessage(message, signature);
    } catch (e) {
      return {
        success: false,
        isAdmin: false,
        error: "Invalid signature format",
      };
    }

    // Check if recovered address matches claimed address (case-insensitive)
    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      console.log("[WalletAuth] Address mismatch:", {
        recovered: recoveredAddress.toLowerCase(),
        claimed: normalizedAddress,
      });
      return {
        success: false,
        isAdmin: false,
        error: "Signature does not match the provided address",
      };
    }

    // Check if the address is an admin wallet
    const isAdmin = await isAdminWallet(recoveredAddress);
    if (!isAdmin) {
      // Also check environment variable for primary admin
      const envAdminWallet = process.env.ADMIN_WALLET_ADDRESS;
      if (!envAdminWallet || recoveredAddress.toLowerCase() !== envAdminWallet.toLowerCase()) {
        return {
          success: false,
          isAdmin: false,
          error: "Unauthorized: Not an admin wallet",
        };
      }
    }

    // Check for replay attack
    const alreadyUsed = await isSignatureUsed(signature);
    if (alreadyUsed) {
      return {
        success: false,
        isAdmin: false,
        error: "Signature already used. Please sign again.",
      };
    }

    // Mark signature as used and remove challenge
    await markSignatureUsed(signature, recoveredAddress);
    await deleteChallenge(normalizedAddress);

    return {
      success: true,
      isAdmin: true,
    };
  } catch (error: any) {
    console.error("[WalletAuth] Verification failed:", error);
    return {
      success: false,
      isAdmin: false,
      error: error.message || "Authentication failed",
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Uses timestamp-only message format
 */
export async function verifyAdminSignature(
  signature: string,
  timestamp: number,
  claimedAddress: string
): Promise<WalletAuthResult> {
  // For getStats and getTransactions calls that use stored auth
  // We need to verify the signature was previously validated
  // Since these use the same signature, we check if it's in our used signatures
  
  try {
    const normalizedAddress = claimedAddress.toLowerCase();
    
    // Check timestamp validity (5 minutes)
    const now = Date.now();
    if (Math.abs(now - timestamp) > SIGNATURE_VALIDITY_MS) {
      return {
        success: false,
        isAdmin: false,
        error: "Authentication token expired. Please sign again.",
      };
    }

    // For subsequent API calls, we verify the signature was previously used (meaning it was validated)
    // This is a security measure - only previously validated signatures are accepted
    const wasUsed = await isSignatureUsed(signature);
    
    if (wasUsed) {
      // Signature was previously validated, check if address is admin
      const isAdmin = await isAdminWallet(claimedAddress);
      const envAdminWallet = process.env.ADMIN_WALLET_ADDRESS;
      const isEnvAdmin = envAdminWallet && normalizedAddress === envAdminWallet.toLowerCase();
      
      if (isAdmin || isEnvAdmin) {
        return { success: true, isAdmin: true };
      }
    }

    return {
      success: false,
      isAdmin: false,
      error: "Invalid or expired authentication",
    };
  } catch (error: any) {
    console.error("[WalletAuth] Verification failed:", error);
    return {
      success: false,
      isAdmin: false,
      error: error.message || "Authentication failed",
    };
  }
}

/**
 * Check if an address is an admin (without signature verification)
 * Used for initial status check
 */
export async function checkAdminStatus(address: string): Promise<boolean> {
  if (!address) return false;
  
  // Check database
  const isDbAdmin = await isAdminWallet(address);
  if (isDbAdmin) return true;
  
  // Check environment variable
  const envAdminWallet = process.env.ADMIN_WALLET_ADDRESS;
  if (envAdminWallet && address.toLowerCase() === envAdminWallet.toLowerCase()) {
    return true;
  }
  
  return false;
}
