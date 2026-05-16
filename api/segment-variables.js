import { createCorsHeaders, jsonResponse, noContentResponse } from "../lib/http.js";

/**
 * Returns the list of variables available for dynamic segment configuration.
 */
export default async function handleSegmentVariables(event, context) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") return noContentResponse(headers);

  try {
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    if (method === "GET") {
      const variables = [
        { field: "email", type: "string", label: "Email Address", entity: "User" },
        { field: "isVerified", type: "boolean", label: "Is Email Verified", entity: "User" },
        { field: "freeScanCount", type: "number", label: "Free Scan Count", entity: "User" },
        { field: "subscriptionStatus", type: "enum", options: ["free", "active", "expired"], label: "Subscription Status", entity: "User" },
        { field: "loginAttempts", type: "number", label: "Login Attempts", entity: "User" },
        { field: "hasClaimedReviewReward", type: "boolean", label: "Has Claimed Review Reward", entity: "User" },
        // Aggregate variables
        { field: "splitBillCount", type: "number", label: "Total Split Bills Created", entity: "Aggregate" },
      ];

      return jsonResponse(200, { success: true, data: variables }, headers);
    }

    return jsonResponse(405, { success: false, error: "Method not allowed" }, headers);
  } catch (error) {
    console.error("Segment variables handler error:", error);
    const { toHttpError } = await import("../lib/errors.js");
    const { errorResponse } = await import("../lib/http.js");
    return errorResponse(toHttpError(error), headers);
  }
}
