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

/**
 * Verify a Google ID token using Google's tokeninfo endpoint.
 * Returns decoded payload: { sub, email, name, picture, email_verified }
 */
async function verifyGoogleToken(idToken) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new HttpError(500, "Google OAuth not configured on server");
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw new HttpError(401, "Invalid Google token");
  }

  const payload = await response.json();

  // Validate the token was issued for our app
  if (payload.aud !== googleClientId) {
    throw new HttpError(401, "Google token audience mismatch");
  }

  if (!payload.email_verified || payload.email_verified === "false") {
    throw new HttpError(401, "Google email not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    image: payload.picture,
  };
}

export async function handleAuthGoogle(event) {
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

    const { idToken, draftId } = await parseJsonBody(event);

    if (!idToken) {
      throw new HttpError(400, "idToken is required");
    }

    // Verify the token with Google
    const googleProfile = await verifyGoogleToken(idToken);
    const { googleId, email, name, image } = googleProfile;

    const logger = await import("../../lib/logger.js");

    // Try to find existing user by googleId first, then by email (merge flow)
    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Check if a user exists with this email (email/password account)
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Merge: link the Google account to the existing email/password account
        user.googleId = googleId;
        user.image = image;
        if (!user.provider || user.provider === "local") {
          // Keep as "local" so they can still use password login too
          // But update image and googleId
        }
        user.lastLoginAt = new Date();
        await user.save();

        logger.info("Merged Google account with existing user", {
          userId: user._id,
          email: user.email,
        });
      } else {
        // Create new user from Google profile
        isNewUser = true;
        user = new User({
          name,
          email: email.toLowerCase(),
          googleId,
          image,
          provider: "google",
          isVerified: true, // Google emails are always verified
          lastLoginAt: new Date(),
          freeScanCount: 5,
        });
        await user.save();

        logger.info("New user created via Google OAuth", {
          userId: user._id,
          email: user.email,
        });
      }
    } else {
      // Known Google user — just update lastLoginAt and image
      user.lastLoginAt = new Date();
      if (image) user.image = image;
      await user.save();

      logger.info("Existing Google user signed in", {
        userId: user._id,
        email: user.email,
      });
    }

    // Auto-associate guest draft with the authenticated user (same as login flow)
    if (draftId) {
      try {
        const SplitBillRecord = (
          await import("../../lib/models/SplitBillRecord.js")
        ).default;
        await SplitBillRecord.findOneAndUpdate(
          { _id: draftId, user: null, status: "editable" },
          { $set: { user: user._id } }
        );
      } catch (draftErr) {
        // Non-fatal: log and continue
        console.warn("Draft association failed on Google login:", draftErr);
      }
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    return jsonResponse(
      200,
      {
        success: true,
        message: isNewUser ? "Account created via Google" : "Login successful via Google",
        isNewUser,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          provider: user.provider,
          isAdmin: user.isAdmin,
          freeScanCount: user.freeScanCount,
          subscriptionStatus: user.subscriptionStatus,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      },
      headers
    );
  } catch (error) {
    console.error("Google auth handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthGoogle;
