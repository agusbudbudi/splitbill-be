const DEFAULT_ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization";
// Comma-separated list can be overridden via env ALLOWED_ORIGINS
const DEFAULT_ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "https://splitbill.my.id,https://www.splitbill.my.id,http://localhost:3000,http://localhost:5173,http://localhost:8080"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function extractOrigin(headers = {}) {
  // Prefer Origin header; fall back to Referer but normalize to origin (scheme + host + port)
  const getRaw = () => {
    try {
      if (headers && typeof headers.get === "function") {
        return (
          headers.get("origin") ||
          headers.get("Origin") ||
          headers.get("referer") ||
          headers.get("Referer") ||
          ""
        );
      }
    } catch (_) {}
    return (
      headers.origin ||
      headers.Origin ||
      headers.referer ||
      headers.Referer ||
      ""
    );
  };

  const raw = getRaw();
  if (!raw || typeof raw !== "string") return "";

  // If it's already a clean origin (no slash after protocol), return as-is.
  // Otherwise, try to parse as URL and return .origin (which strips path/query/hash and trailing slash).
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    // If raw is something like "https://example.com", URL ctor will succeed.
    // If it fails (e.g., bare domain), return as-is to avoid dropping header.
    return raw;
  }
}

function sanitizeHeaderValue(value, fallback) {
  if (!value || typeof value !== "string") {
    return fallback;
  }
  return value;
}

export function createCorsHeaders(event) {
  const headers = event?.headers ?? {};
  const origin = extractOrigin(headers);

  const isAllowedOrigin = origin && DEFAULT_ALLOWED_ORIGINS.includes(origin);

  let requestedHeaders = DEFAULT_ALLOWED_HEADERS;
  try {
    if (headers && typeof headers.get === "function") {
      requestedHeaders =
        headers.get("access-control-request-headers") ||
        DEFAULT_ALLOWED_HEADERS;
    } else {
      requestedHeaders =
        headers["access-control-request-headers"] ||
        headers["Access-Control-Request-Headers"] ||
        DEFAULT_ALLOWED_HEADERS;
    }
  } catch (_) {}

  const allowHeaders = sanitizeHeaderValue(
    requestedHeaders,
    DEFAULT_ALLOWED_HEADERS
  );

  const responseHeaders = {
    Vary: "Origin",
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "*",
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
  };

  if (isAllowedOrigin) {
    responseHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  return responseHeaders;
}

export function jsonResponse(statusCode, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function noContentResponse(headers = {}) {
  return new Response(null, {
    status: 204,
    headers,
  });
}

export function errorResponse(error, headers = {}) {
  const statusCode = error?.statusCode || error?.status || 500;
  const message = error?.message || "Internal server error";
  const payload = {
    success: false,
    error: message,
  };

  if (error?.details) {
    payload.details = error.details;
  }

  return jsonResponse(statusCode, payload, headers);
}
