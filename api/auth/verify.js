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

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new HttpError(400, "Invalid or expired verification token");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

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
