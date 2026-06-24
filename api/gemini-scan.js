import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

// Use Gemini 2.5 Flash-Lite (stable) for cost efficiency
const GOOGLE_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const PROMPT = `
Analyze this bill/receipt image and extract the following information in JSON format:
{
  "merchant_name": "name of the store/restaurant",
  "date": "transaction date (YYYY-MM-DD format)",
  "time": "transaction time (HH:MM format)",
  "items": [
    {
        "name": "item name",
        "quantity": "quantity",
        "price": "price per item",
        "total": "total price for this item"
    }
  ],
  "subtotal": "subtotal amount",
  "tax": "tax amount",
  "service_charge": "service charge if any",
  "discount": "discount amount if any",
  "total_amount": "final total amount",
  "payment_method": "cash/card/etc",
  "receipt_number": "receipt/transaction number"
}
Please extract as much information as possible. Respond with ONLY the JSON.
`;

/**
 * Calls Gemini API with exponential backoff retry on 503 (high demand / overloaded).
 * @param {string} url - Full API URL including key query param
 * @param {object} payload - JSON payload to send
 * @param {AbortSignal} signal - AbortController signal for timeout
 * @param {number} retries - Max number of retry attempts
 */
async function callGemini(url, payload, signal, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 503) {
      const waitMs = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      console.warn(
        `Gemini returned 503 (high demand). Retrying in ${waitMs}ms... (attempt ${i + 1}/${retries})`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    return response;
  }

  throw new HttpError(503, "Gemini API unavailable after multiple retries");
}

export async function handleGeminiScan(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    // Check if token exists in headers to determine if we should authenticate
    let user = null;
    const authHeader = event?.headers?.authorization || event?.headers?.Authorization;
    const hasToken = authHeader && authHeader.startsWith("Bearer ");

    if (hasToken) {
      const { requireUser } = await import("../lib/middleware/auth.js");
      const { connectDatabase } = await import("../lib/db.js");
      await connectDatabase();
      user = await requireUser(event);
    }

    let isSubscribed = false;
    if (user) {
      // Check quota: Allow if subscription is active OR if they have free scans left
      isSubscribed = user.subscriptionStatus === "active";
      if (!isSubscribed && user.freeScanCount <= 0) {
        throw new HttpError(
          403,
          "Kuota scan gratis Anda telah habis. Silakan berlangganan premium untuk scan sepuasnya!",
          "scanExhaustedAndSubscribe"
        );
      }

      // Apply rate limiting per user
      try {
        const { applyGeminiRateLimit } =
          await import("../lib/middleware/rateLimiter.js");
        applyGeminiRateLimit(user._id.toString());
      } catch (rateLimitError) {
        if (rateLimitError.statusCode === 429) {
          throw rateLimitError;
        }
        console.warn("Rate limiter not available:", rateLimitError);
      }
    } else {
      // Apply rate limiting for guests (max 2 per day per IP)
      try {
        const { applyGeminiGuestRateLimit } =
          await import("../lib/middleware/rateLimiter.js");
        applyGeminiGuestRateLimit(event);
      } catch (rateLimitError) {
        if (rateLimitError.statusCode === 429) {
          throw rateLimitError;
        }
        console.warn("Guest rate limiter not available:", rateLimitError);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new HttpError(500, "Missing Gemini API Key");
    }

    const { mime_type, base64Image } = await parseJsonBody(event);

    if (!mime_type || !base64Image) {
      throw new HttpError(
        400,
        "Missing required fields: mime_type and base64Image",
      );
    }

    // Validate MIME type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    const { validateMimeType, validateBase64ImageSize } =
      await import("../lib/middleware/requestValidator.js");

    validateMimeType(mime_type, allowedMimeTypes);

    // Validate image size (max 5MB)
    validateBase64ImageSize(base64Image);

    const payload = {
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type,
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await callGemini(
        `${GOOGLE_API_URL}?key=${apiKey}`,
        payload,
        controller.signal
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // Don't expose API key in error
        const sanitizedError = errorText.replace(apiKey, "[REDACTED]");
        throw new HttpError(
          response.status,
          "Gemini API request failed",
          sanitizedError,
        );
      }

      const data = await response.json();
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResponse) {
        throw new HttpError(500, "Invalid response from Gemini API");
      }

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new HttpError(500, "No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Decrement free scan count only for logged-in, non-subscribed users
      if (user && !isSubscribed) {
        user.freeScanCount = Math.max(0, user.freeScanCount - 1);
        await user.save();
      }

      const logger = await import("../lib/logger.js");
      logger.info("Gemini scan completed", {
        userId: user ? user._id : "guest",
        email: user ? user.email : "guest",
      });

      return jsonResponse(200, parsed, headers);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        throw new HttpError(408, "Request timeout");
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Gemini scan handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleGeminiScan;
