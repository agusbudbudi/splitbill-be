import crypto from "crypto";
import dotenv from "dotenv";
import Order from "../lib/models/Order.js";
import User from "../lib/models/User.js";
import SubscriptionPackage from "../lib/models/SubscriptionPackage.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { authMiddleware, adminMiddleware } from "../lib/middleware/auth.js";
import { applyRateLimit } from "../lib/middleware/rateLimiter.js";

dotenv.config();

export async function handleOrders(event, context) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    switch (method) {
      case "GET":
        return await authMiddleware(getOrders)(event, headers);
      case "POST":
        // Apply rate limit for order creation
        applyRateLimit(event);
        return await authMiddleware(createOrder)(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Orders handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export async function handleOrderById(event, id, context) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    switch (method) {
      case "GET":
        return await authMiddleware((e, h) => getOrderById(e, id, h))(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Order by ID handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function createOrder(event, headers) {
  const body = await parseJsonBody(event);
  const { referenceId, type } = body;
  const user = event.user;

  if (!referenceId || !type) {
    throw new HttpError(400, "Missing referenceId or type");
  }

  let amount = 0;
  let snapshot = {};

  if (type === "subscription") {
    const pkg = await SubscriptionPackage.findById(referenceId);
    if (!pkg) {
      throw new HttpError(404, "Subscription package not found");
    }
    amount = pkg.finalPrice || pkg.price;
    snapshot = {
      name: pkg.name,
      price: pkg.price,
      finalPrice: pkg.finalPrice,
      durationMonths: pkg.durationMonths,
      benefits: pkg.benefits,
    };
  } else {
    throw new HttpError(400, `Unsupported order type: ${type}`);
  }

  // ✅ SHOULD DO: Idempotency check to prevent duplicate pending orders
  const existingOrder = await Order.findOne({
    userId: user._id,
    referenceId,
    type,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (existingOrder) {
    return jsonResponse(
      200,
      {
        success: true,
        data: {
          orderId: existingOrder.orderId,
          amount: existingOrder.amount,
          expiresAt: existingOrder.expiresAt,
          qrisData: existingOrder.qrisData,
          status: existingOrder.status,
          packageId: existingOrder.referenceId,
          createdAt: existingOrder.createdAt,
        },
      },
      headers
    );
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "");
  const orderId = `SB-${dateStr}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  // Call Pakasir API to create QRIS
  const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY;
  const PAKASIR_SLUG = process.env.PAKASIR_SLUG;

  if (!PAKASIR_API_KEY || !PAKASIR_SLUG) {
    throw new HttpError(500, "Payment gateway configuration missing");
  }

  try {
    const response = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: PAKASIR_SLUG,
        order_id: orderId,
        amount,
        api_key: PAKASIR_API_KEY,
      }),
    });

    const resData = await response.json();
    if (!response.ok || !resData.payment) {
      throw new Error(resData.message || "Failed to create QRIS from Pakasir");
    }

    const order = new Order({
      orderId,
      userId: user._id,
      type,
      referenceId,
      snapshot,
      amount,
      expiresAt,
      qrisData: resData.payment,
    });

    await order.save();

    return jsonResponse(
      201,
      {
        success: true,
        data: {
          orderId: order.orderId,
          amount: order.amount,
          expiresAt: order.expiresAt,
          qrisData: order.qrisData,
          status: order.status,
          packageId: order.referenceId,
          createdAt: order.createdAt,
        },
      },
      headers
    );
  } catch (error) {
    console.error("Pakasir API Error:", error);
    throw new HttpError(500, error.message || "Payment gateway error");
  }
}

async function getOrderById(event, id, headers) {
  const user = event.user;
  
  let query = { orderId: id };
  if (!user.isAdmin) {
    query.userId = user._id;
  }

  const order = await Order.findOne(query).populate("userId", "name email");

  if (!order) {
    throw new HttpError(404, "Order not found");
  }

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        id: order._id,
        orderId: order.orderId,
        type: order.type,
        status: order.status,
        amount: order.amount,
        snapshot: order.snapshot,
        qrisData: order.qrisData,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
        packageId: order.referenceId,
        createdAt: order.createdAt,
        user: order.userId ? {
          id: order.userId._id,
          name: order.userId.name,
          email: order.userId.email
        } : null,
        paymentMethod: order.paymentMethod,
        isSandbox: order.isSandbox,
        total_payment: order.qrisData?.total_payment || order.amount,
        fee: order.qrisData?.fee || 0,
      },
    },
    headers
  );
}

async function getOrders(event, headers) {
  const user = event.user;
  const url = new URL(event.url || `http://localhost${event.path || ""}`);
  
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";
  const startDate = url.searchParams.get("startDate") || "";
  const endDate = url.searchParams.get("endDate") || "";

  let query = user.isAdmin ? {} : { userId: user._id };

  if (status) {
    query.status = status;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    const searchConditions = [{ orderId: searchRegex }];

    if (user.isAdmin) {
      // Find users matching name or email
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id").lean();
      
      if (matchingUsers.length > 0) {
        searchConditions.push({ userId: { $in: matchingUsers.map(u => u._id) } });
      }
    }
    
    query = { ...query, $or: searchConditions };
  }

  const totalItems = await Order.countDocuments(query);
  const totalPages = Math.ceil(totalItems / limit);

  // Calculate total revenue from matching PAID orders
  const revenueQuery = { ...query, status: "paid" };
  const revenueResult = await Order.aggregate([
    { $match: revenueQuery },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;

  let ordersQuery = Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (user.isAdmin) {
    ordersQuery = ordersQuery.populate("userId", "name email");
  }

  const orders = await ordersQuery;

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        orders: orders.map((order) => ({
          id: order._id,
          orderId: order.orderId,
          type: order.type,
          status: order.status,
          amount: order.amount,
          packageId: order.referenceId,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          snapshot: order.snapshot,
          total_payment: order.qrisData?.total_payment || order.amount,
          fee: order.qrisData?.fee || 0,
          user: order.userId && typeof order.userId === 'object' ? {
            id: order.userId._id,
            name: order.userId.name,
            email: order.userId.email
          } : null,
        })),
        pagination: {
          totalItems,
          totalPages,
          currentPage: page,
          limit,
        },
        totalRevenue
      },
    },
    headers
  );
}

