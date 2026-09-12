import mongoose from "mongoose";

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
import { mapBucket, sanitizeBucketPayload } from "./index.js";

export async function findOwnedBucket(user, bucketId) {
  if (!mongoose.Types.ObjectId.isValid(bucketId)) {
    throw new HttpError(400, "ID bucket tidak valid");
  }
  const bucket = await SplitLaterBucket.findOne({ _id: bucketId, user: user._id });
  if (!bucket) {
    throw new HttpError(404, "Bucket tidak ditemukan");
  }
  return bucket;
}

export async function handleSplitLaterBucketById(event, bucketId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    const user = await requireUser(event);

    if (method === "GET" && user.isAdmin) {
      if (!mongoose.Types.ObjectId.isValid(bucketId)) {
        throw new HttpError(400, "ID bucket tidak valid");
      }
      const bucket = await SplitLaterBucket.findById(bucketId).populate("user", "name email");
      if (!bucket) {
        throw new HttpError(404, "Bucket tidak ditemukan");
      }
      return jsonResponse(200, { success: true, bucket: mapBucket(bucket) }, headers);
    }

    const bucket = await findOwnedBucket(user, bucketId);

    if (method === "GET") {
      return jsonResponse(200, { success: true, bucket: mapBucket(bucket) }, headers);
    }

    if (method === "PUT") {
      const payload = await parseJsonBody(event);
      const sanitized = sanitizeBucketPayload(payload, { partial: true });
      Object.assign(bucket, sanitized);
      await bucket.save();
      return jsonResponse(200, { success: true, bucket: mapBucket(bucket) }, headers);
    }

    if (method === "DELETE") {
      await bucket.deleteOne();
      return jsonResponse(200, { success: true }, headers);
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Split later bucket handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitLaterBucketById;
