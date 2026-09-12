import SplitLaterBucket from "../../../lib/models/SplitLaterBucket.js";
import { requireUser } from "../../../lib/middleware/auth.js";
import { connectDatabase } from "../../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../../lib/http.js";
import { parseJsonBody } from "../../../lib/parsers.js";
import { HttpError, toHttpError } from "../../../lib/errors.js";

// POST /api/split-later/buckets/verify-ownership — given a list of receipt
// image URLs, returns which ones belong to one of the requesting user's own
// buckets. Used by the web app's blob-delete route to authorize a delete
// without shipping the user's entire bucket/receipt history over the wire.
export async function handleVerifyOwnership(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();
    const user = await requireUser(event);

    const payload = await parseJsonBody(event);
    const urls = Array.isArray(payload?.urls)
      ? payload.urls.filter((u) => typeof u === "string" && u)
      : [];

    if (urls.length === 0) {
      return jsonResponse(200, { success: true, ownedUrls: [] }, headers);
    }

    const result = await SplitLaterBucket.aggregate([
      { $match: { user: user._id } },
      { $unwind: "$receipts" },
      { $match: { "receipts.imageUrl": { $in: urls } } },
      { $group: { _id: null, urls: { $addToSet: "$receipts.imageUrl" } } },
    ]);

    return jsonResponse(
      200,
      { success: true, ownedUrls: result[0]?.urls ?? [] },
      headers,
    );
  } catch (error) {
    console.error("Verify ownership handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleVerifyOwnership;
