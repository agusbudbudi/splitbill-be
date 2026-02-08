import { HttpError } from "../errors.js";

/**
 * In-memory rate limiter for serverless functions
 * Note: For production with multiple instances, consider using Redis
 */

class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < this.windowMs,
      );
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }

  check(identifier) {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Filter out expired timestamps
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (validTimestamps.length >= this.maxRequests) {
      const oldestTimestamp = Math.min(...validTimestamps);
      const resetTime = new Date(oldestTimestamp + this.windowMs);
      throw new HttpError(429, `Too many requests. Please try again later.`, {
        resetTime: resetTime.toISOString(),
      });
    }

    // Add current request
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    return {
      remaining: this.maxRequests - validTimestamps.length,
      resetTime: new Date(now + this.windowMs),
    };
  }
}

// Extract IP address from event
function getClientIp(event) {
  const headers = event?.headers || {};

  // Try to get IP from various headers
  let ip = null;

  try {
    if (headers && typeof headers.get === "function") {
      ip =
        headers.get("x-forwarded-for") ||
        headers.get("x-real-ip") ||
        headers.get("cf-connecting-ip") ||
        null;
    } else {
      ip =
        headers["x-forwarded-for"] ||
        headers["X-Forwarded-For"] ||
        headers["x-real-ip"] ||
        headers["X-Real-IP"] ||
        headers["cf-connecting-ip"] ||
        null;
    }
  } catch (_) {}

  // x-forwarded-for can contain multiple IPs, take the first one
  if (ip && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  return ip || "unknown";
}

// Create rate limiter instances
const generalLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
);

const authLimiter = new RateLimiter(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
);

const emailLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 emails per hour
);

const geminiLimiter = new RateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 scans per hour per user
);

/**
 * Apply rate limiting based on IP address
 */
export function applyRateLimit(event, limiter = generalLimiter) {
  const ip = getClientIp(event);
  const result = limiter.check(ip);
  return result;
}

/**
 * Apply rate limiting for authentication endpoints
 */
export function applyAuthRateLimit(event) {
  return applyRateLimit(event, authLimiter);
}

/**
 * Apply rate limiting for email endpoints (by email address)
 */
export function applyEmailRateLimit(email) {
  if (!email || typeof email !== "string") {
    throw new HttpError(400, "Email is required for rate limiting");
  }
  const normalizedEmail = email.toLowerCase().trim();
  return emailLimiter.check(normalizedEmail);
}

/**
 * Apply rate limiting for Gemini API (by user ID)
 */
export function applyGeminiRateLimit(userId) {
  if (!userId) {
    throw new HttpError(401, "Authentication required");
  }
  const identifier = `gemini:${userId}`;
  return geminiLimiter.check(identifier);
}

/**
 * Middleware wrapper for rate limiting
 */
export function rateLimitMiddleware(limiterFn = applyRateLimit) {
  return (event) => {
    limiterFn(event);
  };
}
