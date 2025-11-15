import dotenv from "dotenv";

import User from "./models/User.js";
import { connectDatabase } from "../lib/db.js";
import { createCorsHeaders, errorResponse, jsonResponse, noContentResponse } from "../lib/http.js";
import { HttpError, toHttpError } from "../lib/errors.js";

dotenv.config();

export async function handleUsers(event) {
  const headers = createCorsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (event.httpMethod !== "GET") {
      throw new HttpError(405, `Method ${event.httpMethod} not allowed`);
    }

    await connectDatabase();
    const users = await User.find({});

    return jsonResponse(200, { success: true, users }, headers);
  } catch (error) {
    console.error("Users handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleUsers;
