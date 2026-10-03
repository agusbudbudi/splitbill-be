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

export async function handleSplitBillAdjacent(event, recordId) {
  const headers = createCorsHeaders(event);
  if ((event?.httpMethod || event?.method || "GET") === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new HttpError(400, "ID split bill tidak valid");
    }

    await connectDatabase();
    const user = await requireUser(event);

    // Only admins can use this endpoint; regular users don't need cross-record navigation
    const baseQuery = user.isAdmin ? {} : { user: user._id };

    const current = await SplitBillRecord.findOne({ _id: recordId, ...baseQuery }).select("updatedAt").lean();
    if (!current) {
      throw new HttpError(404, "Split bill tidak ditemukan");
    }

    const currentDate = current.updatedAt;

    // Records are listed updatedAt DESC, so:
    // "previous" = updated LATER than current (i.e. appears BEFORE in list)
    // "next"     = updated EARLIER than current (i.e. appears AFTER in list)
    const [prevRecord, nextRecord] = await Promise.all([
      SplitBillRecord.findOne({
        ...baseQuery,
        updatedAt: { $gt: currentDate },
      })
        .sort({ updatedAt: 1 })
        .select("_id activityName")
        .lean(),
      SplitBillRecord.findOne({
        ...baseQuery,
        updatedAt: { $lt: currentDate },
      })
        .sort({ updatedAt: -1 })
        .select("_id activityName")
        .lean(),
    ]);

    return jsonResponse(
      200,
      {
        success: true,
        prev: prevRecord
          ? { id: prevRecord._id.toString(), activityName: prevRecord.activityName }
          : null,
        next: nextRecord
          ? { id: nextRecord._id.toString(), activityName: nextRecord.activityName }
          : null,
      },
      headers
    );
  } catch (error) {
    console.error("Split bill adjacent handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

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
      // Shared links are openable by anyone with the valid ID — no auth or
      // ownership check on GET (no 'isPublic' flag exists to gate this).
      const record = await SplitBillRecord.findById(recordId).populate("user", "name email");

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
    }

    if (method === "DELETE") {
      const user = await requireUser(event);
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
