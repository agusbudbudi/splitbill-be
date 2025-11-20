import dotenv from "dotenv";

import User from "../../lib/models/User.js";
import { generateTokens } from "../../lib/middleware/auth.js";
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

export async function handleAuthRegister(event) {
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

    const { name, email, password } = await parseJsonBody(event);

    if (!name || !email || !password) {
      throw new HttpError(400, "Name, email, and password are required");
    }

    if (password.length < 6) {
      throw new HttpError(400, "Password must be at least 6 characters long");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw new HttpError(400, "User with this email already exists");
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    return jsonResponse(
      201,
      {
        success: true,
        message: "User registered successfully",
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
    console.error("Register handler error:", error);

    if (error?.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return errorResponse(new HttpError(400, messages.join(", ")), headers);
    }

    if (error?.code === 11000) {
      return errorResponse(
        new HttpError(400, "User with this email already exists"),
        headers
      );
    }

    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthRegister;
