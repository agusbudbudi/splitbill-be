const REVALIDATE_TIMEOUT_MS = 5000;

/**
 * Asks splitbill-web to drop its ISR copies of the given paths/cache tags so
 * CMS changes show up on the next visit instead of after the hourly
 * revalidate. Returns whether it succeeded; a failure never fails the caller's
 * save — the pages still refresh on their own schedule. The web only accepts
 * paths/tags on its allowlist (src/app/api/revalidate/route.ts).
 */
export async function revalidateWeb({ paths = [], tags = [] }) {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    console.warn("WEB_REVALIDATE_URL/REVALIDATE_SECRET not set — skipping web revalidate");
    return false;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ paths, tags }),
      signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Web revalidate failed with status", res.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Web revalidate request failed:", error);
    return false;
  }
}
