import mongoose from "mongoose";

import SplitBillRecord from "../../lib/models/SplitBillRecord.js";
import { requireUser } from "../../lib/middleware/auth.js";
import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

import { mapRecord } from "./index.js";

export async function handleSplitBillById(event, recordId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new HttpError(400, "ID split bill tidak valid");
    }

    await connectDatabase();
    if (method === "GET") {
      let user = null;
      try {
        user = await requireUser(event);
      } catch (authErr) {
        // Optional auth: allow guest access for GET
        if (authErr.statusCode !== 401) {
          throw authErr;
        }
      }

      const record = await SplitBillRecord.findById(recordId);

      if (!record) {
        throw new HttpError(404, "Split bill tidak ditemukan");
      }

      // If authenticated, we could still show it (publicly shared)
      // but we skip the "this user only" check for GET if it's a valid ID
      // Note: In a real production app, we might want a 'isPublic' flag on the record
      // for now, we follow the user's request to allow opening shared links.

      return jsonResponse(
        200,
        {
          success: true,
          record: mapRecord(record),
        },
        headers
      );
    }

    if (method === "DELETE") {
      const result = await SplitBillRecord.deleteOne({
        _id: recordId,
        user: user._id,
      });

      if (result.deletedCount === 0) {
        throw new HttpError(404, "Split bill tidak ditemukan atau sudah dihapus");
      }

      return jsonResponse(
        200,
        {
          success: true,
          message: "Split bill berhasil dihapus",
        },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Split bill detail handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitBillById;
