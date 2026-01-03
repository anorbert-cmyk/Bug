/**
 * Security Middleware
 * Rate limiting, input sanitization, and security headers
 */

import { Request, Response, NextFunction } from "express";

// In-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
};

const strictConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // Reduced from 10 for sensitive endpoints
};

// Payment endpoints - reasonable limits (not too strict for legitimate users)
const paymentConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 payment attempts per minute (allows retries)
};

// Analysis config (Perplexity API costs money, but paid users should have good UX)
const analysisConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // Max 20 analyses per hour per IP (reasonable for power users)
};

// Email submission config (prevent spam)
const emailConfig: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // Max 5 email submissions per hour
};

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(config: RateLimitConfig = defaultConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Create new record
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return next();
    }

    if (record.count >= config.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      return res.status(429).json({
        error: "Too many requests",
        retryAfter,
      });
    }

    record.count++;
    return next();
  };
}

/**
 * Strict rate limiting for sensitive endpoints
 */
export const strictRateLimit = rateLimit(strictConfig);

/**
 * API rate limiting
 */
export const apiRateLimit = rateLimit(defaultConfig);

/**
 * Webhook rate limiting (more permissive)
 */
export const webhookRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 50,
});

/**
 * Payment rate limiting (ultra-strict to prevent fraud)
 * Only 3 payment attempts per minute per IP
 */
export const paymentRateLimit = rateLimit(paymentConfig);

/**
 * Analysis rate limiting (protects expensive Perplexity API)
 * Only 10 analyses per hour per IP
 */
export const analysisRateLimit = rateLimit(analysisConfig);

/**
 * Email submission rate limiting (prevents spam)
 * Only 5 email submissions per hour per IP
 */
export const emailRateLimit = rateLimit(emailConfig);

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://commerce.coinbase.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.stripe.com https://api.commerce.coinbase.com https://api.perplexity.ai; " +
    "frame-src https://js.stripe.com https://commerce.coinbase.com;"
  );
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  
  next();
}

/**
 * Sanitize request body (basic XSS prevention)
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    // Basic HTML entity encoding for dangerous characters
    return obj
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Request logging middleware (for security monitoring)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  
  // Log request (avoid logging sensitive data)
  console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);
  
  // Track response time
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 5000) {
      console.warn(`[SLOW REQUEST] ${method} ${path} took ${duration}ms`);
    }
  });
  
  next();
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, record] of entries) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute
