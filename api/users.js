import dotenv from "dotenv";

import User from "../lib/models/User.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
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
    const users = await User.find({});

    // Return raw array to match expected response shape
    return jsonResponse(200, users, headers);
  } catch (error) {
    console.error("Users handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleUsers;
