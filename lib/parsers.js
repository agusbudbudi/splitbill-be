import { HttpError } from "./errors.js";

function getContentType(headers) {
  try {
    if (headers && typeof headers.get === "function") {
      return headers.get("content-type") || headers.get("Content-Type") || "";
    }
  } catch (_) {}
  return headers?.["content-type"] || headers?.["Content-Type"] || "";
}

export async function parseJsonBody(event) {
  // Netlify Functions v2: event is a Request
  if (event && typeof event.json === "function") {
    const method = event.method || "GET";
    if (method === "GET" || method === "HEAD") return {};

    const ct = (getContentType(event.headers) || "").toLowerCase();
    try {
      if (ct.includes("application/json") || ct === "") {
        // Let Request.json() do the work; will throw if invalid
        return await event.json();
      }
      // Fallback to text then parse
      const text = await event.text();
      return text ? JSON.parse(text) : {};
    } catch (err) {
      throw new HttpError(400, "Invalid JSON payload");
    }
  }

  // Netlify Functions v1 compatibility
  if (!event?.body) {
    return {};
  }

  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (error) {
    throw new HttpError(400, "Invalid JSON payload");
  }
}

export function getQueryParams(event) {
  try {
    if (event && typeof event.url === "string") {
      const url = new URL(event.url);
      return Object.fromEntries(url.searchParams.entries());
    }
  } catch (_) {}
  return event?.queryStringParameters || {};
}
