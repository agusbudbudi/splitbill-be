import dotenv from "dotenv";

import User from "../../lib/models/User.js";
import { connectDatabase } from "../../lib/db.js";
import { sendVerificationEmail } from "../../lib/email.js";
import crypto from "crypto";
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

    // Apply rate limiting
    try {
      const { applyAuthRateLimit } =
        await import("../../lib/middleware/rateLimiter.js");
      applyAuthRateLimit(event);
    } catch (rateLimitError) {
      if (rateLimitError.statusCode === 429) {
        throw rateLimitError;
      }
      console.warn("Rate limiter not available:", rateLimitError);
    }

    await connectDatabase();

    const { name, email, password } = await parseJsonBody(event);

    if (!name || !email || !password) {
      throw new HttpError(400, "Name, email, and password are required");
    }

    // Validate name length
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      throw new HttpError(400, "Name must be between 2 and 50 characters");
    }

    // Validate password strength
    if (password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters long");
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new HttpError(
        400,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      throw new HttpError(400, "User with this email already exists");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const user = new User({
      name: trimmedName,
      email: normalizedEmail,
      password,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // We still return 201 as user is created, but maybe inform them or have a retry
    }

    const logger = await import("../../lib/logger.js");
    logger.info("New user registered", {
      userId: user._id,
      email: user.email,
    });

    return jsonResponse(
      201,
      {
        success: true,
        message:
          "User registered successfully. Please check your email to verify your account.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          isVerified: user.isVerified,
        },
      },
      headers,
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
        headers,
      );
    }

    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthRegister;
