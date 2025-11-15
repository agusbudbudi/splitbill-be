import mongoose from "mongoose";
import dotenv from "dotenv";

import { connectDatabase } from "../lib/db.js";
import { createCorsHeaders, errorResponse, jsonResponse, noContentResponse } from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

dotenv.config();

const WalletSchema = new mongoose.Schema({
  name: String,
  method: String,
  bankName: String,
  accountNumber: String,
  phoneNumber: String,
});

const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

export async function handleWallets(event) {
  const headers = createCorsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (event.httpMethod === "POST") {
      const data = parseJsonBody(event);
      const wallet = new Wallet(data);
      await wallet.save();
      return jsonResponse(201, { success: true, wallet }, headers);
    }

    if (event.httpMethod === "GET") {
      const wallets = await Wallet.find();
      return jsonResponse(200, { success: true, wallets }, headers);
    }

    throw new HttpError(405, `Method ${event.httpMethod} not allowed`);
  } catch (error) {
    console.error("Wallets handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleWallets;
