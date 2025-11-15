import handleRoot from "../../api/index.js";
import handleParticipants from "../../api/participants/index.js";
import handleParticipantById from "../../api/participants/[participantId].js";
import handleReviews from "../../api/reviews.js";
import handleAuthLogin from "../../api/auth/login.js";
import handleAuthRegister from "../../api/auth/register.js";
import handleAuthLogout from "../../api/auth/logout.js";
import handleAuthMe from "../../api/auth/me.js";
import handleUsers from "../../api/users.js";
import handleWallets from "../../api/wallets.js";
import handleGeminiScan from "../../api/gemini-scan.js";
import { createCorsHeaders, jsonResponse } from "../../lib/http.js";

function getRequestPath(event) {
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
  if (!path) {
    return "/";
  }

  return path
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api\b/, "")
    .replace(/^\/+/, "/")
    .replace(/\/+$/, "") || "/";
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
      return handleRoot(event, context);
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

    if (resource === "wallets" && !subresource && rest.length === 0) {
      return handleWallets(event, context);
    }

    if (resource === "gemini-scan" && !subresource && rest.length === 0) {
      return handleGeminiScan(event, context);
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
