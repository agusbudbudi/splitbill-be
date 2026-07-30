import dotenv from "dotenv";
import User from "../../lib/models/User.js";
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

export async function handleAuthVerify(event) {
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

    const { token } = await parseJsonBody(event);

    if (!token) {
      throw new HttpError(400, "Verification token is required");
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      throw new HttpError(400, "Invalid or expired verification token");
    }

    // Idempotent: link may be pre-fetched by email security scanners
    // (Gmail/Outlook link protection) before the user actually clicks it.
    // If already verified via that earlier hit, treat this as success too.
    if (user.isVerified) {
      return jsonResponse(
        200,
        {
          success: true,
          message: "Email verified successfully. You can now log in.",
        },
        headers,
      );
    }

    if (
      !user.verificationTokenExpires ||
      user.verificationTokenExpires.getTime() < Date.now()
    ) {
      throw new HttpError(400, "Invalid or expired verification token");
    }

    user.isVerified = true;
    await user.save();

    return jsonResponse(
      200,
      {
        success: true,
        message: "Email verified successfully. You can now log in.",
      },
      headers,
    );
  } catch (error) {
    console.error("Verify handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAuthVerify;
