import dotenv from "dotenv";

import User from "../lib/models/User.js";
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

    const { page = 1, limit = 10 } = getQueryParams(event);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (pageNum - 1) * limitNum;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [users, totalItems, activeUsersCount] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments({}),
      User.countDocuments({
        isVerified: true,
        lastLogin: { $gte: sixMonthsAgo },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    return jsonResponse(
      200,
      {
        success: true,
        data: {
          users,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems,
            activeUsersCount,
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
