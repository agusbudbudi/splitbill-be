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
    const user = await requireUser(event);

    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    const record = await SplitBillRecord.findOne({
      _id: recordId,
      user: user._id,
    });

    if (!record) {
      throw new HttpError(404, "Split bill tidak ditemukan");
    }

    return jsonResponse(
      200,
      {
        success: true,
        record: mapRecord(record),
      },
      headers
    );
  } catch (error) {
    console.error("Split bill detail handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitBillById;
