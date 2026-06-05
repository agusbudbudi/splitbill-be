import dotenv from "dotenv";

import User from "../lib/models/User.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { getQueryParams } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

dotenv.config();

export async function handleUsers(event) {
  const headers = createCorsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    const method = event?.httpMethod || event?.method || "GET";
    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();

    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    const { page = 1, limit = 10, search = "", isVerified, subscriptionStatus } = getQueryParams(event);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (search) {
      filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
    }
    if (isVerified !== undefined && isVerified !== "") {
      filter.isVerified = isVerified === "true";
    }
    if (subscriptionStatus) {
      filter.subscriptionStatus = subscriptionStatus;
    }

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [users, totalItems, verifiedUsersCount, activeUsersCount, usersWithSplitBill, splitBillCounts] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(filter),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ lastLogin: { $gte: threeMonthsAgo } }),
      SplitBillRecord.distinct("user").then((ids) => ids.length),
      SplitBillRecord.aggregate([{ $group: { _id: "$user", count: { $sum: 1 } } }]),
    ]);

    const splitBillCountMap = Object.fromEntries(
      splitBillCounts
        .filter(({ _id }) => _id !== null && _id !== undefined)
        .map(({ _id, count }) => [_id.toString(), count])
    );

    const usersWithCounts = users.map((u) => ({
      ...u.toObject(),
      splitBillCount: splitBillCountMap[u._id.toString()] ?? 0,
    }));

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    return jsonResponse(
      200,
      {
        success: true,
        data: {
          users: usersWithCounts,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems,
            verifiedUsersCount,
            activeUsersCount,
            usersWithSplitBillCount: usersWithSplitBill,
            itemsPerPage: limitNum,
          },
        },
      },
      headers,
    );
  } catch (error) {
    console.error("Users handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleUsers;
