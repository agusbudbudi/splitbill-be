import { createCorsHeaders, jsonResponse, noContentResponse } from "../../lib/http.js";

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
  
  // Handle OPTIONS preflight requests globally
  const method = event?.method || event?.httpMethod;
  if (method === "OPTIONS") {
    const headers = createCorsHeaders(event);
    return noContentResponse(headers);
  }

  let segments = extractSegments(normalizedPath);

  if (segments[0] === "api") {
    segments = segments.slice(1);
  }

  console.log("API Request Path:", normalizedPath, "Segments:", segments);

  try {
    if (segments.length === 0) {
      const headers = createCorsHeaders(event);
      return jsonResponse(200, { route: "root", requestPath, normalizedPath }, headers);
    }

    const [resource, subresource, ...rest] = segments;

    if (resource === "auth" && rest.length === 0) {
      switch (subresource) {
        case "login": {
          const { default: h } = await import("../../api/auth/login.js");
          return h(event, context);
        }
        case "register": {
          const { default: h } = await import("../../api/auth/register.js");
          return h(event, context);
        }
        case "logout": {
          const { default: h } = await import("../../api/auth/logout.js");
          return h(event, context);
        }
        case "me": {
          const { default: h } = await import("../../api/auth/me.js");
          return h(event, context);
        }
        case "verify": {
          const { default: h } = await import("../../api/auth/verify.js");
          return h(event, context);
        }
        case "resend-verification": {
          const { default: h } = await import("../../api/auth/resend-verification.js");
          return h(event, context);
        }
        default:
          break;
      }
    }

    if (resource === "participants") {
      if (!subresource && rest.length === 0) {
        const { default: h } = await import("../../api/participants/index.js");
        return h(event, context);
      }
      if (subresource && rest.length === 0) {
        const { default: h } = await import("../../api/participants/[participantId].js");
        return h(event, subresource, context);
      }
    }

    if (resource === "reviews" && rest.length === 0) {
      const { default: h } = await import("../../api/reviews.js");
      return h(event, context, subresource);
    }

    if (resource === "banners" && !subresource && rest.length === 0) {
      const { default: h } = await import("../../api/banners.js");
      return h(event, context);
    }

    if (resource === "users") {
      if (!subresource && rest.length === 0) {
        const { default: h } = await import("../../api/users.js");
        return h(event, context);
      }
      if (subresource && rest.length === 0) {
        const { default: h } = await import("../../api/user-by-id.js");
        return h(event, subresource, context);
      }
    }

    if (resource === "gemini-scan" && !subresource && rest.length === 0) {
      const { default: h } = await import("../../api/gemini-scan.js");
      return h(event, context);
    }

    if (resource === "insights" && !subresource && rest.length === 0) {
      const { default: h } = await import("../../api/insights.js");
      return h(event, context);
    }

    if (resource === "split-bills") {
      if (!subresource && rest.length === 0) {
        const { default: h } = await import("../../api/split-bills/index.js");
        return h(event, context);
      }
      if (subresource && rest.length === 0) {
        const { default: h } = await import("../../api/split-bills/[recordId].js");
        return h(event, subresource, context);
      }
    }

    if (resource === "payment") {
      const { handlePaymentCreate, handleGetPaymentById } = await import("../../api/payment.js");
      if (subresource === "create" && rest.length === 0) {
        return handlePaymentCreate(event, context);
      }
      if (subresource && rest.length === 0) {
        return handleGetPaymentById(event, subresource, context);
      }
    }

    if (resource === "subscription-packages") {
      const { handleSubscriptionPackages, handleSubscriptionPackageById } = await import("../../api/subscription-packages.js");
      if (!subresource && rest.length === 0) {
        return handleSubscriptionPackages(event, context);
      }
      if (subresource && rest.length === 0) {
        if (subresource === "public") {
          return handleSubscriptionPackages(event, context, "public");
        }
        return handleSubscriptionPackageById(event, subresource, context);
      }
    }

    if (resource === "orders") {
      const { handleOrders, handleOrderById } = await import("../../api/orders.js");
      if (!subresource && rest.length === 0) {
        return handleOrders(event, context);
      }
      if (subresource === "create" && rest.length === 0) {
        return handleOrders(event, context);
      }
      if (subresource && rest.length === 0) {
        return handleOrderById(event, subresource, context);
      }
    }

    if (resource === "blogs") {
      if (!subresource && rest.length === 0) {
        const { default: h } = await import("../../api/blogs.js");
        return h(event, context);
      }
      if (subresource && rest.length === 0) {
        const { default: h } = await import("../../api/blog-by-id.js");
        return h(event, subresource, context);
      }
    }

    if (resource === "pakasir-webhook" && !subresource && rest.length === 0) {
      const { default: h } = await import("../../api/pakasir-webhook.js");
      return h(event, context);
    }

    if (resource === "campaigns") {
      if ((!subresource || subresource === "preview") && rest.length === 0) {
        const { default: h } = await import("../../api/campaigns.js");
        return h(event, context);
      }
      if (subresource && subresource !== "preview" && rest.length === 0) {
        const { default: h } = await import("../../api/campaign-by-id.js");
        return h(event, subresource, context);
      }
    }

    const headers = createCorsHeaders(event);
    return jsonResponse(404, { success: false, error: "Not found" }, headers);
  } catch (error) {
    console.error("Unhandled API router error:", error);
    const headers = createCorsHeaders(event);
    return jsonResponse(500, { success: false, error: "Internal server error" }, headers);
  }
}

export default handler;
