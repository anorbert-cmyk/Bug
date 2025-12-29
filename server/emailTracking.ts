/**
 * Email Tracking Module
 * 
 * Handles recording email opens via tracking pixels
 */

import { getDb } from "./db";
import { emailOpens, emailSequenceStatus, emailSubscribers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Generate a unique tracking ID for an email
 */
export function generateTrackingId(): string {
  return nanoid(24);
}

/**
 * Get the tracking pixel URL for an email
 */
export function getTrackingPixelUrl(trackingId: string, baseUrl: string): string {
  return `${baseUrl}/api/track/email-open/${trackingId}`;
}

/**
 * Get the tracking pixel HTML to embed in emails
 */
export function getTrackingPixelHtml(trackingId: string, baseUrl: string): string {
  const url = getTrackingPixelUrl(trackingId, baseUrl);
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
}

/**
 * Record an email open event
 */
export async function recordEmailOpen(
  trackingId: string,
  userAgent: string,
  ipAddress: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("[EmailTracking] Database not available");
    return false;
  }

  try {
    // Parse tracking ID to get email info
    // Format: {subscriberId}-{emailNumber}-{uniqueId}
    const parts = trackingId.split("-");
    if (parts.length < 3) {
      console.error("[EmailTracking] Invalid tracking ID format:", trackingId);
      return false;
    }

    const subscriberId = parseInt(parts[0]);
    const emailNumber = parseInt(parts[1]);
    
    if (isNaN(subscriberId) || isNaN(emailNumber)) {
      console.error("[EmailTracking] Invalid tracking ID values:", trackingId);
      return false;
    }

    // Get subscriber email
    const subscriber = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.id, subscriberId))
      .limit(1);

    if (subscriber.length === 0) {
      console.error("[EmailTracking] Subscriber not found:", subscriberId);
      return false;
    }

    const email = subscriber[0].email;

    // Check if this tracking ID was already recorded (prevent duplicate opens)
    const existing = await db
      .select()
      .from(emailOpens)
      .where(eq(emailOpens.trackingId, trackingId))
      .limit(1);

    if (existing.length > 0) {
      console.log("[EmailTracking] Duplicate open ignored:", trackingId);
      return true; // Already recorded, not an error
    }

    // Record the open
    await db.insert(emailOpens).values({
      trackingId,
      subscriberId,
      email,
      emailNumber,
      userAgent,
      ipAddress,
    });

    // Update the email sequence status with the open timestamp
    const openField = `email${emailNumber}OpenedAt` as const;
    const now = new Date();

    // Get existing sequence status
    const sequenceStatus = await db
      .select()
      .from(emailSequenceStatus)
      .where(eq(emailSequenceStatus.subscriberId, subscriberId))
      .limit(1);

    if (sequenceStatus.length > 0) {
      // Only update if not already set (first open)
      const status = sequenceStatus[0];
      const currentOpenedAt = status[openField as keyof typeof status];
      
      if (!currentOpenedAt) {
        const updateData: Record<string, Date> = {};
        updateData[openField] = now;
        
        await db
          .update(emailSequenceStatus)
          .set(updateData)
          .where(eq(emailSequenceStatus.id, status.id));
      }
    }

    console.log(`[EmailTracking] Recorded open for email ${emailNumber} to ${email}`);
    return true;
  } catch (error) {
    console.error("[EmailTracking] Error recording email open:", error);
    return false;
  }
}

/**
 * Get email open statistics for a subscriber
 */
export async function getSubscriberOpenStats(subscriberId: number): Promise<{
  email1Opened: boolean;
  email2Opened: boolean;
  email3Opened: boolean;
  email4Opened: boolean;
  totalOpens: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      email1Opened: false,
      email2Opened: false,
      email3Opened: false,
      email4Opened: false,
      totalOpens: 0,
    };
  }

  const opens = await db
    .select()
    .from(emailOpens)
    .where(eq(emailOpens.subscriberId, subscriberId));

  const openedEmails = new Set(opens.map((o) => o.emailNumber));

  return {
    email1Opened: openedEmails.has(1),
    email2Opened: openedEmails.has(2),
    email3Opened: openedEmails.has(3),
    email4Opened: openedEmails.has(4),
    totalOpens: opens.length,
  };
}

/**
 * Get overall email open statistics
 */
export async function getEmailOpenStats(): Promise<{
  email1: { sent: number; opened: number; rate: number };
  email2: { sent: number; opened: number; rate: number };
  email3: { sent: number; opened: number; rate: number };
  email4: { sent: number; opened: number; rate: number };
}> {
  const db = await getDb();
  if (!db) {
    return {
      email1: { sent: 0, opened: 0, rate: 0 },
      email2: { sent: 0, opened: 0, rate: 0 },
      email3: { sent: 0, opened: 0, rate: 0 },
      email4: { sent: 0, opened: 0, rate: 0 },
    };
  }

  // Get all sequence statuses
  const statuses = await db.select().from(emailSequenceStatus);

  const stats = {
    email1: { sent: 0, opened: 0, rate: 0 },
    email2: { sent: 0, opened: 0, rate: 0 },
    email3: { sent: 0, opened: 0, rate: 0 },
    email4: { sent: 0, opened: 0, rate: 0 },
  };

  for (const status of statuses) {
    if (status.email1SentAt) {
      stats.email1.sent++;
      if (status.email1OpenedAt) stats.email1.opened++;
    }
    if (status.email2SentAt) {
      stats.email2.sent++;
      if (status.email2OpenedAt) stats.email2.opened++;
    }
    if (status.email3SentAt) {
      stats.email3.sent++;
      if (status.email3OpenedAt) stats.email3.opened++;
    }
    if (status.email4SentAt) {
      stats.email4.sent++;
      if (status.email4OpenedAt) stats.email4.opened++;
    }
  }

  // Calculate rates
  stats.email1.rate = stats.email1.sent > 0 ? Math.round((stats.email1.opened / stats.email1.sent) * 100) : 0;
  stats.email2.rate = stats.email2.sent > 0 ? Math.round((stats.email2.opened / stats.email2.sent) * 100) : 0;
  stats.email3.rate = stats.email3.sent > 0 ? Math.round((stats.email3.opened / stats.email3.sent) * 100) : 0;
  stats.email4.rate = stats.email4.sent > 0 ? Math.round((stats.email4.opened / stats.email4.sent) * 100) : 0;

  return stats;
}
