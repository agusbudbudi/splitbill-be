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
    if (method !== "GET" && method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    if (method === "POST") {
      const user = await User.findById(userId);
      if (!user) throw new HttpError(404, "User not found");

      const { parseJsonBody } = await import("../lib/parsers.js");
      const body = await parseJsonBody(event);
      const { action } = body;

      let message = "";
      if (action === "reset-password") {
        const tempPass = Math.random().toString(36).slice(-8);
        user.password = tempPass; // hashed by pre-save hook
        await user.save();
        message = `Password sementara baru: ${tempPass}`;
      } else if (action === "toggle-verify") {
        user.isVerified = !user.isVerified;
        await user.save();
        message = `Verifikasi diubah menjadi: ${user.isVerified ? "Terverifikasi" : "Belum Verifikasi"}`;
      } else if (action === "reset-scan-quota") {
        user.freeScanCount = 5;
        await user.save();
        message = "Kuota scan AI gratis direset menjadi 5.";
      } else {
        throw new HttpError(400, `Unknown action: ${action}`);
      }

      return jsonResponse(200, { success: true, message, user }, headers);
    }

    // GET Request
    let user;
    try {
      user = await User.findById(userId).populate("orderId", "orderId");
    } catch (populateErr) {
      console.warn("Failed to populate orderId for user, querying without populate:", populateErr);
      user = await User.findById(userId);
    }
    if (!user) throw new HttpError(404, "User not found");

    const url = new URL(event.url || `http://localhost${event.path || ""}`);
    const splitBillsPage = parseInt(url.searchParams.get("splitBillsPage") || "1", 10);
    const splitBillsLimit = parseInt(url.searchParams.get("splitBillsLimit") || "5", 10);
    const splitBillsSkip = (splitBillsPage - 1) * splitBillsLimit;

    const totalSplitBillsCount = await SplitBillRecord.countDocuments({ user: userId });

    const { mapRecord } = await import("./split-bills/index.js");
    const [splitBills, totalTagihanResult, orders] = await Promise.all([
      SplitBillRecord.find({ user: userId })
        .sort({ occurredAt: -1 })
        .skip(splitBillsSkip)
        .limit(splitBillsLimit)
        .populate("user", "name email"),
      // BUG #3 FIX: Hitung total tagihan di DB, bukan di frontend dari data parsial
      SplitBillRecord.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: null, total: { $sum: "$summary.total" } } },
      ]),
      Order.find({ userId: user._id }).sort({ createdAt: -1 })
    ]);

    const totalTagihan = totalTagihanResult[0]?.total ?? 0;
    const mappedSplitBills = splitBills.map(mapRecord);

    return jsonResponse(
      200,
      {
        success: true,
        data: {
          user,
          splitBills: mappedSplitBills,
          totalTagihan,
          orders,
          splitBillsPagination: {
            totalItems: totalSplitBillsCount,
            totalPages: Math.ceil(totalSplitBillsCount / splitBillsLimit),
            currentPage: splitBillsPage,
            limit: splitBillsLimit,
          }
        }
      },
      headers,
    );
  } catch (error) {
    console.error("UserById handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}
