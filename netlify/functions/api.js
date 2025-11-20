import handleRoot from "../../api/index.js";
import handleParticipants from "../../api/participants/index.js";
import handleParticipantById from "../../api/participants/[participantId].js";
import handleReviews from "../../api/reviews.js";
import handleAuthLogin from "../../api/auth/login.js";
import handleAuthRegister from "../../api/auth/register.js";
import handleAuthLogout from "../../api/auth/logout.js";
import handleAuthMe from "../../api/auth/me.js";
import handleUsers from "../../api/users.js";
import handleGeminiScan from "../../api/gemini-scan.js";
import handleSplitBills from "../../api/split-bills/index.js";
import handleSplitBillById from "../../api/split-bills/[recordId].js";
import { createCorsHeaders, jsonResponse } from "../../lib/http.js";

function getRequestPath(event) {
  // Netlify Functions v2: Request object with .url
  if (event && typeof event.url === "string") {
    try {
      const u = new URL(event.url);
      return u.pathname || "/";
    } catch (_) {
      // ignore URL parse errors
    }
  }

  // Try common proxy headers first (Netlify/AWS) to get the original URI
  try {
    const headers = event?.headers || {};
    const headerPath =
      (typeof headers.get === "function" &&
        (headers.get("x-forwarded-uri") ||
          headers.get("x-original-uri") ||
          headers.get("x-rewrite-url") ||
          headers.get("x-nf-original-pathname"))) ||
      headers["x-forwarded-uri"] ||
      headers["X-Forwarded-Uri"] ||
      headers["x-original-uri"] ||
      headers["X-Original-Uri"] ||
      headers["x-rewrite-url"] ||
      headers["X-Rewrite-Url"] ||
      headers["x-nf-original-pathname"];

    if (typeof headerPath === "string" && headerPath.trim()) {
      return headerPath;
    }
  } catch (_) {
    // ignore header parsing errors
  }

  // If rawUrl contains '/api/' or '/.netlify/functions/api', extract from there
  try {
    const raw = String(event?.rawUrl || "");
    const apiIdx = raw.indexOf("/api/");
    if (apiIdx >= 0) {
      return raw.substring(apiIdx);
    }
    const fnIdx = raw.indexOf("/.netlify/functions/api/");
    if (fnIdx >= 0) {
      return raw.substring(fnIdx);
    }
  } catch (_) {
    // ignore parsing errors
  }

  if (event?.rawUrl) {
    try {
      const url = new URL(event.rawUrl);
      return url.pathname || "/";
    } catch (error) {
      console.warn("Failed to parse rawUrl", event.rawUrl, error);
    }
  }

  return event?.path || "/";
}

function normalizePath(path) {
  if (!path) return "/";

  let p = path;

  // ensure it starts with a slash
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }

  // strip Netlify functions prefix with an optional trailing slash
  p = p.replace(/^\/\.netlify\/functions\/api\/?/, "/");

  // collapse multiple slashes
  p = p.replace(/\/{2,}/g, "/");

  // trim trailing slashes except for root
  if (p.length > 1) {
    p = p.replace(/\/+$/, "");
  }

  return p || "/";
}

function extractSegments(path) {
  if (path === "/") {
    return [];
  }

  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export async function handler(event, context) {
  const requestPath = getRequestPath(event);
  const normalizedPath = normalizePath(requestPath);
  let segments = extractSegments(normalizedPath);

  if (segments[0] === "api") {
    segments = segments.slice(1);
  }

  try {
    if (segments.length === 0) {
      // Temporary debug output to inspect routing input from Netlify
      const headers = createCorsHeaders(event);
      return jsonResponse(
        200,
        {
          route: "root",
          requestPath,
          normalizedPath,
          url: typeof event?.url === "string" ? event.url : null,
          method: event?.method || event?.httpMethod || null,
          rawUrl: event?.rawUrl || null,
          path: event?.path || null,
          eventType: Object.prototype.toString.call(event),
          eventCtor: event?.constructor?.name || null,
          eventKeys: (() => {
            try {
              return Object.getOwnPropertyNames(event || {});
            } catch {
              return [];
            }
          })(),
          hasHeadersGet: typeof event?.headers?.get === "function",
          headers: {
            host: event?.headers?.host || event?.headers?.Host || null,
            "x-forwarded-uri":
              event?.headers?.["x-forwarded-uri"] ||
              event?.headers?.["X-Forwarded-Uri"] ||
              null,
            "x-original-uri":
              event?.headers?.["x-original-uri"] ||
              event?.headers?.["X-Original-Uri"] ||
              null,
          },
        },
        headers
      );
    }

    const [resource, subresource, ...rest] = segments;

    if (resource === "auth" && rest.length === 0) {
      switch (subresource) {
        case "login":
          return handleAuthLogin(event, context);
        case "register":
          return handleAuthRegister(event, context);
        case "logout":
          return handleAuthLogout(event, context);
        case "me":
          return handleAuthMe(event, context);
        default:
          break;
      }
    }

    if (resource === "participants") {
      if (!subresource && rest.length === 0) {
        return handleParticipants(event, context);
      }

      if (subresource && rest.length === 0) {
        return handleParticipantById(event, subresource, context);
      }
    }

    if (resource === "reviews" && !subresource && rest.length === 0) {
      return handleReviews(event, context);
    }

    if (resource === "users" && !subresource && rest.length === 0) {
      return handleUsers(event, context);
    }

    if (resource === "gemini-scan" && !subresource && rest.length === 0) {
      return handleGeminiScan(event, context);
    }

    if (resource === "split-bills") {
      if (!subresource && rest.length === 0) {
        return handleSplitBills(event, context);
      }

      if (subresource && rest.length === 0) {
        return handleSplitBillById(event, subresource, context);
      }
    }

    const headers = createCorsHeaders(event);
    return jsonResponse(404, { success: false, error: "Not found" }, headers);
  } catch (error) {
    console.error("Unhandled API router error:", error);
    const headers = createCorsHeaders(event);
    return jsonResponse(
      500,
      { success: false, error: "Internal server error" },
      headers
    );
  }
}

export default handler;
