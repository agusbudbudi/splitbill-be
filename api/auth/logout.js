import dotenv from "dotenv";

import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";
import { verifyRefreshToken } from "../middleware/auth.js";

dotenv.config();

export async function handleAuthLogout(event) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();

    const { refreshToken } = parseJsonBody(event);

    if (refreshToken) {
      try {
        verifyRefreshToken(refreshToken);
      } catch (error) {
        console.log("Invalid refresh token during logout:", error.message);
      }
    }

    return jsonResponse(
      200,
      {
        success: true,
        message: "Logout successful",
      },
      headers
    );
  } catch (error) {
    console.error("Logout handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthLogout;
