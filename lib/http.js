const DEFAULT_ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization";

function extractOrigin(headers = {}) {
  return headers.origin || headers.Origin || headers.referer || headers.Referer || "";
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
  const allowHeaders = sanitizeHeaderValue(
    headers["access-control-request-headers"] || headers["Access-Control-Request-Headers"],
    DEFAULT_ALLOWED_HEADERS
  );

  const responseHeaders = {
    "Vary": "Origin",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": DEFAULT_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": allowHeaders,
  };

  if (origin) {
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
