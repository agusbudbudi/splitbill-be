import mongoose from "mongoose";

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

function applyReceiptPatch(receipt, payload) {
  if (payload.merchant !== undefined) {
    receipt.merchant = normalizeTrimmedString(payload.merchant);
  }
  if (payload.totalAmount !== undefined) {
    receipt.totalAmount = normalizeAmount(payload.totalAmount);
  }
  if (payload.notes !== undefined) {
    receipt.notes = normalizeTrimmedString(payload.notes);
  }
  if (payload.status !== undefined) {
    if (payload.status !== "pending" && payload.status !== "completed") {
      throw new HttpError(400, "Status struk tidak valid");
    }
    receipt.status = payload.status;
  }
  if (payload.splitBillId !== undefined) {
    if (payload.splitBillId && !mongoose.Types.ObjectId.isValid(payload.splitBillId)) {
      throw new HttpError(400, "ID split bill tidak valid");
    }
    receipt.splitBillId = payload.splitBillId || undefined;
  }
}

// PUT/DELETE /api/split-later/buckets/:bucketId/receipts/:receiptId
export async function handleSplitLaterReceiptById(event, bucketId, receiptId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    const user = await requireUser(event);
    const bucket = await findOwnedBucket(user, bucketId);

    const receipt = bucket.receipts.id(receiptId);
    if (!receipt) {
      throw new HttpError(404, "Struk tidak ditemukan");
    }

    if (method === "PUT") {
      const payload = await parseJsonBody(event);
      applyReceiptPatch(receipt, payload);
      await bucket.save();
      return jsonResponse(200, { success: true, bucket: mapBucket(bucket) }, headers);
    }

    if (method === "DELETE") {
      receipt.deleteOne();
      await bucket.save();
      return jsonResponse(200, { success: true, bucket: mapBucket(bucket) }, headers);
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Split later receipt-by-id handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitLaterReceiptById;
