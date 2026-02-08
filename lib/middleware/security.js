/**
 * Security headers middleware
 * Adds security-related HTTP headers to protect against common vulnerabilities
 */

export function getSecurityHeaders() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    // Prevent clickjacking attacks
    "X-Frame-Options": "DENY",

    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",

    // Enable XSS protection (legacy browsers)
    "X-XSS-Protection": "1; mode=block",

    // Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissions policy (restrict browser features)
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",

    // Strict Transport Security (HTTPS only) - only in production
    ...(isProduction && {
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
    }),

    // Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  };
}

/**
 * Add security headers to response headers object
 */
export function addSecurityHeaders(headers = {}) {
  const securityHeaders = getSecurityHeaders();
  return {
    ...headers,
    ...securityHeaders,
  };
}

/**
 * Middleware to apply security headers
 */
export function securityMiddleware(handler) {
  return async (event, existingHeaders = {}) => {
    const response = await handler(event, existingHeaders);

    // If response is a Response object, add headers
    if (response && typeof response === "object" && response.headers) {
      const securityHeaders = getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        if (!response.headers.has(key)) {
          response.headers.set(key, value);
        }
      });
    }

    return response;
  };
}
