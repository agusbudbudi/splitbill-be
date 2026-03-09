import Payment from "../lib/models/Payment.js";
import { connectDatabase } from "../lib/db.js";
import { createCorsHeaders, jsonResponse } from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import crypto from "crypto";

export async function handlePaymentCreate(event, context) {
  const headers = createCorsHeaders(event);
  
  const method = event.method || event.httpMethod;
  if (method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" }, headers);
  }

  try {
    await connectDatabase();
    
    const { name, phone, amount } = await parseJsonBody(event);

    if (!name || !phone || !amount) {
      return jsonResponse(400, { success: false, error: "Missing required fields" }, headers);
    }

    const paymentId = `pay_${crypto.randomUUID().split("-")[0]}${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const payment = new Payment({
      paymentId,
      name,
      phone,
      amount,
      expiresAt,
    });

    await payment.save();

    // Determine the frontend URL (in production this should be the web domain)
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const paymentUrl = `${baseUrl}/pay/${paymentId}`;

    return jsonResponse(201, {
      success: true,
      data: {
        paymentId,
        paymentUrl,
      }
    }, headers);
  } catch (error) {
    console.error("Error creating payment:", error);
    return jsonResponse(500, { success: false, error: "Internal server error" }, headers);
  }
}

export async function handleGetPaymentById(event, paymentId, context) {
  const headers = createCorsHeaders(event);

  try {
    await connectDatabase();

    const payment = await Payment.findOne({ paymentId });

    if (!payment) {
      return jsonResponse(404, { success: false, error: "Payment not found" }, headers);
    }

    // Check if expired
    if (new Date() > payment.expiresAt) {
      if (payment.status === "pending") {
        payment.status = "expired";
        await payment.save();
      }
      return jsonResponse(410, { 
        success: false, 
        error: "This payment request has expired",
        data: {
          name: payment.name,
          phone: payment.phone,
          amount: payment.amount,
          status: "expired"
        }
      }, headers);
    }

    return jsonResponse(200, {
      success: true,
      data: {
        name: payment.name,
        phone: payment.phone,
        amount: payment.amount,
        status: payment.status,
        expiresAt: payment.expiresAt,
      }
    }, headers);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return jsonResponse(500, { success: false, error: "Internal server error" }, headers);
  }
}
