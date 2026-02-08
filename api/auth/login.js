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

    // Apply rate limiting
    try {
      const { applyAuthRateLimit } =
        await import("../../lib/middleware/rateLimiter.js");
      applyAuthRateLimit(event);
    } catch (rateLimitError) {
      if (rateLimitError.statusCode === 429) {
        throw rateLimitError;
      }
      // If rate limiter fails to load, continue (fail open)
      console.warn("Rate limiter not available:", rateLimitError);
    }

    await connectDatabase();

    const { email, password } = await parseJsonBody(event);

    if (!email || !password) {
      throw new HttpError(400, "Email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Use consistent error message to prevent email enumeration
    const invalidCredentialsError = new HttpError(
      401,
      "Invalid email or password",
    );

    if (!user) {
      // Log security event for failed login attempt
      const logger = await import("../../lib/logger.js");
      logger.security("Failed login attempt - user not found", {
        email: email.toLowerCase(),
      });
      throw invalidCredentialsError;
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockUntil = new Date(user.lockUntil);
      const logger = await import("../../lib/logger.js");
      logger.security("Login attempt on locked account", {
        userId: user._id,
        email: user.email,
        lockUntil: lockUntil.toISOString(),
      });
      throw new HttpError(
        423,
        `Account is locked due to too many failed login attempts. Please try again after ${lockUntil.toLocaleTimeString()}`,
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();

      const logger = await import("../../lib/logger.js");
      logger.security("Failed login attempt - invalid password", {
        userId: user._id,
        email: user.email,
        loginAttempts: user.loginAttempts + 1,
      });

      throw invalidCredentialsError;
    }

    if (!user.isVerified) {
      throw new HttpError(
        403,
        "Email not verified. Please check your email to verify your account.",
      );
    }

    // Check if user is admin
    if (!user.isAdmin) {
      const logger = await import("../../lib/logger.js");
      logger.security("Non-admin user attempted to access admin dashboard", {
        userId: user._id,
        email: user.email,
      });
      throw new HttpError(
        403,
        "Anda tidak memiliki akses admin. Halaman ini hanya untuk administrator.",
      );
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    const { accessToken, refreshToken } = generateTokens(user._id);

    const logger = await import("../../lib/logger.js");
    logger.info("Successful login", {
      userId: user._id,
      email: user.email,
    });

    return jsonResponse(
      200,
      {
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
      headers,
    );
  } catch (error) {
    console.error("Login handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthLogin;
