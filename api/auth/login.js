import dotenv from "dotenv";

import User from "../models/User.js";
import { generateTokens } from "../middleware/auth.js";
import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

dotenv.config();

export async function handleAuthLogin(event) {
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

    const { email, password } = await parseJsonBody(event);

    if (!email || !password) {
      throw new HttpError(400, "Email and password are required");
    }

    console.log("Attempting login for email:", email);

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    return jsonResponse(
      200,
      {
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
      headers
    );
  } catch (error) {
    console.error("Login handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthLogin;
