import dotenv from "dotenv";
import crypto from "crypto";
import User from "../../lib/models/User.js";
import { connectDatabase } from "../../lib/db.js";
import { sendVerificationEmail } from "../../lib/email.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

dotenv.config();

export async function handleResendVerification(event) {
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

    const { email } = await parseJsonBody(event);

    if (!email) {
      throw new HttpError(400, "Email is required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      // For security reasons, don't reveal if user exists
      return jsonResponse(
        200,
        {
          success: true,
          message:
            "If an account exists with that email, a verification link has been sent.",
        },
        headers,
      );
    }

    if (user.isVerified) {
      return jsonResponse(
        200,
        {
          success: true,
          message: "Account is already verified. Please log in.",
        },
        headers,
      );
    }

    // Generate new token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;

    await user.save();

    await sendVerificationEmail(user.email, user.name, verificationToken);

    return jsonResponse(
      200,
      {
        success: true,
        message: "Verification email resent successfully.",
      },
      headers,
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleResendVerification;
