import dotenv from "dotenv";
import Order from "../../lib/models/Order.js";

import { requireUser } from "../../lib/middleware/auth.js";
import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

dotenv.config();

export async function handleAuthMe(event) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();
    const user = await requireUser(event);

    // Populate order if exists to get more details
    let orderInfo = null;
    if (user.orderId) {
      const order = await Order.findById(user.orderId);
      if (order) {
        orderInfo = {
          orderId: order.orderId,
          paidAt: order.paidAt,
          snapshot: order.snapshot
        };
      }
    }

    return jsonResponse(
      200,
      {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          freeScanCount: user.freeScanCount,
          createdAt: user.createdAt,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionExpiry: user.subscriptionExpiry,
          order: orderInfo
        },
      },
      headers,
    );
  } catch (error) {
    console.error("Get current user handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthMe;
