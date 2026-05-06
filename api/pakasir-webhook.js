import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "../lib/models/Order.js";
import User from "../lib/models/User.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { toHttpError } from "../lib/errors.js";

dotenv.config();

export default async function handlePakasirWebhook(event, context) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" }, headers);
  }

  try {
    await connectDatabase();
    const body = await parseJsonBody(event);
    const { amount, order_id, project, status, payment_method, completed_at, is_sandbox } = body || {};

    const PAKASIR_API_KEY = process.env.PAKASIR_API_KEY;
    const PAKASIR_SLUG = process.env.PAKASIR_SLUG;

    if (project !== PAKASIR_SLUG) {
      console.warn(`Invalid project slug received: ${project}`);
      return jsonResponse(400, { success: false, error: "Invalid project slug" }, headers);
    }

    let isVerified = false;

    // Recommended: Validate via Pakasir API if we have an API Key
    if (PAKASIR_API_KEY) {
      try {
        const verifyUrl = `https://app.pakasir.com/api/transactiondetail?project=${project}&amount=${amount}&order_id=${order_id}&api_key=${PAKASIR_API_KEY}`;
        console.log("Verifying transaction with Pakasir:", verifyUrl);
        const response = await fetch(verifyUrl);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Pakasir verification response:", JSON.stringify(data));

          if (data.transaction && data.transaction.status === "completed") {
            isVerified = true;
          } else {
            console.warn(`Transaction verification failed for order ${order_id}. Response status: ${data.transaction?.status}`);
          }
        } else {
          console.error(`Pakasir API returned status ${response.status} during verification.`);
        }
      } catch (err) {
        console.error("Failed to verify transaction with Pakasir API:", err);
      }
    } else {
      console.warn("PAKASIR_API_KEY is not configured. Cannot verify webhook against API.");
    }

    if (!isVerified) {
      if (process.env.NODE_ENV !== "development") {
        return jsonResponse(400, { success: false, error: "Transaction validation failed or could not be verified" }, headers);
      } else {
        console.info("Proceeding with unverified transaction because NODE_ENV === 'development'.");
      }
    }

    if (status === "completed") {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const order = await Order.findOne({ orderId: order_id }).session(session);
        
        if (!order) {
          console.warn(`Order not found: ${order_id}`);
          await session.abortTransaction();
          session.endSession();
          return jsonResponse(404, { success: false, error: "Order not found" }, headers);
        }

        if (order.status === "paid") {
          await session.abortTransaction();
          session.endSession();
          return jsonResponse(200, { success: true, message: "Order already processed" }, headers);
        }

        // Check amount (allow some tolerance or exact match)
        if (Number(amount) < Number(order.amount)) {
          console.warn(`Partial payment detected for order ${order_id}: ${amount} < ${order.amount}`);
          await session.abortTransaction();
          session.endSession();
          return jsonResponse(400, { success: false, error: "Invalid amount" }, headers);
        }

        // Update Order
        order.status = "paid";
        order.paymentMethod = payment_method || "QRIS";
        order.paidAt = completed_at ? new Date(completed_at) : new Date();
        order.isSandbox = is_sandbox || false;
        await order.save({ session });

        // Update User if it's a subscription
        if (order.type === "subscription") {
          const user = await User.findById(order.userId).session(session);
          if (user) {
            user.subscriptionStatus = "active";
            user.subscriptionPlan = order.snapshot.name;
            
            // Calculate expiry: Extend if currently active, otherwise start from paidAt
            const durationMonths = order.snapshot.durationMonths || 1;
            const now = new Date();
            const startFrom = (user.subscriptionExpiry && user.subscriptionExpiry > now) 
              ? user.subscriptionExpiry 
              : new Date(order.paidAt);
            
            const expiryDate = new Date(startFrom);
            expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
            
            user.subscriptionExpiry = expiryDate;
            user.orderId = order._id;
            await user.save({ session });
            console.log(`Subscription activated/renewed for user ${user.email}, plan: ${user.subscriptionPlan}, new expiry: ${expiryDate.toISOString()}`);
          }
        }

        await session.commitTransaction();
        session.endSession();
        return jsonResponse(200, { success: true, message: "Webhook processed successfully" }, headers);
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    }

    return jsonResponse(200, { success: true, message: "Webhook received (status not completed)" }, headers);
  } catch (error) {
    console.error("Pakasir Webhook error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}
