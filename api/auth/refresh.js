import dotenv from "dotenv";

import User from "../../lib/models/User.js";
import { generateTokens, verifyRefreshToken } from "../../lib/middleware/auth.js";
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

export async function handleAuthRefresh(event) {
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

    const { refreshToken } = await parseJsonBody(event);
    if (!refreshToken) {
      throw new HttpError(400, "Refresh token is required");
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new HttpError(401, "Invalid refresh token - user not found");
    }

    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      throw new HttpError(401, "Refresh token has been revoked");
    }

    if (!user.isVerified) {
      throw new HttpError(
        403,
        "Email not verified. Please check your email to verify your account.",
      );
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id,
      user.tokenVersion,
    );

    return jsonResponse(
      200,
      {
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      },
      headers,
    );
  } catch (error) {
    console.error("Refresh token handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthRefresh;
