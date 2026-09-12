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
import { mapBucket } from "./index.js";
import { findOwnedBucket } from "./[bucketId].js";
import { normalizeAmount, normalizeTrimmedString } from "./receiptFields.js";

function sanitizeReceiptPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Payload tidak valid");
  }
  const imageUrl = normalizeTrimmedString(payload.imageUrl) || "";
  if (!imageUrl) {
    throw new HttpError(400, "URL gambar struk wajib diisi");
  }
  return {
    imageUrl,
    merchant: normalizeTrimmedString(payload.merchant),
    totalAmount: normalizeAmount(payload.totalAmount),
    notes: normalizeTrimmedString(payload.notes),
  };
}

// POST /api/split-later/buckets/:bucketId/receipts — add a receipt to a bucket
export async function handleSplitLaterReceipts(event, bucketId) {
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
    const bucket = await findOwnedBucket(user, bucketId);

    const payload = await parseJsonBody(event);
    const sanitized = sanitizeReceiptPayload(payload);

    bucket.receipts.push(sanitized);
    const newReceipt = bucket.receipts[bucket.receipts.length - 1];
    await bucket.save();

    return jsonResponse(
      201,
      { success: true, bucket: mapBucket(bucket), receiptId: newReceipt._id.toString() },
      headers,
    );
  } catch (error) {
    console.error("Split later receipts handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitLaterReceipts;
