import User from "../lib/models/User.js";
import Order from "../lib/models/Order.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { HttpError, toHttpError } from "../lib/errors.js";

export default async function handleUserById(event, userId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") return noContentResponse(headers);

  try {
    if (method !== "GET") throw new HttpError(405, `Method ${method} not allowed`);

    await connectDatabase();
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    let user;
    try {
      user = await User.findById(userId).populate("orderId", "orderId");
    } catch (populateErr) {
      console.warn("Failed to populate orderId for user, querying without populate:", populateErr);
      user = await User.findById(userId);
    }
    if (!user) throw new HttpError(404, "User not found");

    const { mapRecord } = await import("./split-bills/index.js");
    const splitBills = await SplitBillRecord.find({ user: userId })
      .sort({ occurredAt: -1 })
      .populate("user", "name email");

    const mappedSplitBills = splitBills.map(mapRecord);

    return jsonResponse(
      200,
      { success: true, data: { user, splitBills: mappedSplitBills } },
      headers,
    );
  } catch (error) {
    console.error("UserById handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}
