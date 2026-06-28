import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { callGroq } from "../lib/ai-providers.js";

// Use Gemini 2.5 Flash-Lite (stable) for cost efficiency
const GOOGLE_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

// Compact prompt for Gemini — ~65% fewer input tokens vs verbose schema.
// responseMimeType:"application/json" in generationConfig handles output format enforcement,
// so the prompt only needs to describe fields — no example JSON needed.
const PROMPT =
  `Extract all data from this receipt/bill image as JSON with these fields: ` +
  `merchant_name, date(YYYY-MM-DD), time(HH:MM), ` +
  `items[{name,quantity,price,total}], ` +
  `subtotal, tax, service_charge, discount, total_amount, payment_method, receipt_number. ` +
  `Use null for any missing field. Numbers as strings.`;

/**
 * Status codes that should trigger a fallback to the next AI provider
 * instead of returning an error to the user.
 *  429 — quota / rate limit exceeded
 *  503 — service overloaded (after retries)
 */
const FALLBACK_STATUS_CODES = new Set([429, 503]);

/**
 * Calls Gemini API with exponential backoff retry on 503 (high demand / overloaded).
 * Uses fast backoff (200ms, 500ms) to leave time for the Groq fallback.
 *
 * @param {string} url - Full API URL including key query param
 * @param {object} payload - JSON payload to send
 * @param {AbortSignal} signal - AbortController signal for this provider's timeout
 * @param {number} retries - Max number of retry attempts (default 2 to save time)
 * @returns {{ response: Response|null, shouldFallback: boolean }}
 */
async function callGeminiWithFallbackInfo(url, payload, signal, retries = 2) {
  // Fast backoff: 200ms, 500ms — keeps total retry overhead under 1 second
  const BACKOFF_MS = [200, 500];

  for (let i = 0; i < retries; i++) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (fetchErr) {
      // AbortError from this provider's timeout — signal fallback
      if (fetchErr.name === "AbortError") {
        console.warn("[Gemini] Timed out — will fallback to Groq");
        return { response: null, shouldFallback: true };
      }
      throw fetchErr;
    }

    if (response.status === 503) {
      const waitMs = BACKOFF_MS[i] ?? 500;
      console.warn(
        `[Gemini] 503 (high demand). Retrying in ${waitMs}ms... (attempt ${i + 1}/${retries})`
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (response.status === 429) {
      console.warn("[Gemini] 429 quota exceeded — will fallback to Groq");
      return { response: null, shouldFallback: true };
    }

    return { response, shouldFallback: false };
  }

  // Exhausted retries on 503 — trigger fallback
  console.warn("[Gemini] 503 after all retries — will fallback to Groq");
  return { response: null, shouldFallback: true };
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

    // Connect database at the start of request to support logging to DB
    const { connectDatabase } = await import("../lib/db.js");
    await connectDatabase();

    // Check if token exists in headers to determine if we should authenticate
    let user = null;
    const rawHeaders = event?.headers;
    let authHeader = null;
    if (rawHeaders && typeof rawHeaders.get === "function") {
      authHeader = rawHeaders.get("authorization") || rawHeaders.get("Authorization");
    } else if (rawHeaders) {
      authHeader = rawHeaders.authorization || rawHeaders.Authorization;
    }
    const hasToken = authHeader && authHeader.startsWith("Bearer ");

    if (hasToken) {
      const { requireUser } = await import("../lib/middleware/auth.js");
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
        const { applyScanRateLimit } =
          await import("../lib/middleware/rateLimiter.js");
        applyScanRateLimit(user._id.toString());
      } catch (rateLimitError) {
        if (rateLimitError.statusCode === 429) {
          throw rateLimitError;
        }
        console.warn("Rate limiter not available:", rateLimitError);
      }
    } else {
      // Apply rate limiting for guests (max 1 per day per IP)
      try {
        const { applyScanGuestRateLimit } =
          await import("../lib/middleware/rateLimiter.js");
        applyScanGuestRateLimit(event);
      } catch (rateLimitError) {
        if (rateLimitError.statusCode === 429) {
          throw rateLimitError;
        }
        console.warn("Guest rate limiter not available:", rateLimitError);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

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

    // Validate image size (max 4MB — aligned with Groq's base64 request limit)
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
      // generationConfig optimizations:
      //  responseMimeType — forces native JSON output (no markdown wrapping)
      //  maxOutputTokens  — cap output at 800 (observed ~300-400 for typical receipts)
      //  temperature:0    — deterministic extraction, no creative variation
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 800,
        temperature: 0,
      },
    };

    // ── Timeout strategy ──────────────────────────────────────────────────
    // Total budget: 28s (2s buffer before Netlify's 30s hard limit)
    // Groq   gets 14s as primary provider (fast inference, token-efficient)
    // Gemini gets 12s as fallback if Groq is unavailable
    // Both are guarded individually so a slow primary never starves the fallback.
    const GROQ_TIMEOUT_MS   = 14000;
    const GEMINI_TIMEOUT_MS = 12000;

    // Outer guard: abort everything after 28s
    const outerController = new AbortController();
    const outerTimeoutId  = setTimeout(() => outerController.abort(), 28000);

    let parsed = null;
    let providerUsed = "groq";

    try {
      // ── Step 1: Try Groq — primary provider (14s budget) ──────────────
      if (!groqApiKey) {
        console.warn("[Groq] GROQ_API_KEY not set — skipping to Gemini fallback");
      } else {
        const groqController = new AbortController();
        const groqTimeoutId  = setTimeout(() => groqController.abort(), GROQ_TIMEOUT_MS);

        // Propagate outer abort into Groq controller
        outerController.signal.addEventListener("abort", () => groqController.abort(), { once: true });

        try {
          parsed = await callGroq(groqApiKey, base64Image, mime_type, groqController.signal);
          providerUsed = "groq";
        } catch (groqError) {
          // Don't throw — fall through to Gemini fallback
          console.warn("[Groq] Primary failed, will fallback to Gemini:", groqError.message);
        } finally {
          clearTimeout(groqTimeoutId);
        }
      }

      // ── Step 2: Fallback to Gemini if Groq was unavailable (12s budget) ─
      if (!parsed) {
        console.info("[Fallback] Attempting Gemini 2.5 Flash-Lite...");

        const geminiController = new AbortController();
        const geminiTimeoutId  = setTimeout(() => geminiController.abort(), GEMINI_TIMEOUT_MS);

        // Propagate outer abort into Gemini controller
        outerController.signal.addEventListener("abort", () => geminiController.abort(), { once: true });

        let geminiResult;
        try {
          geminiResult = await callGeminiWithFallbackInfo(
            `${GOOGLE_API_URL}?key=${apiKey}`,
            payload,
            geminiController.signal
          );
        } finally {
          clearTimeout(geminiTimeoutId);
        }

        const { response, shouldFallback } = geminiResult;

        if (shouldFallback || !response) {
          throw new HttpError(
            503,
            "AI service temporarily unavailable. Please try again later."
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          const sanitizedError = errorText.replace(apiKey, "[REDACTED]");
          throw new HttpError(
            response.status,
            "AI scan request failed",
            sanitizedError,
          );
        }

        const data = await response.json();
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
          throw new HttpError(500, "Invalid response from Gemini API");
        }

        // responseMimeType:"application/json" in generationConfig ensures Gemini
        // returns clean JSON directly — no markdown wrapping needed.
        try {
          parsed = JSON.parse(textResponse);
        } catch {
          // Fallback: extract JSON block in case model didn't honour responseMimeType
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new HttpError(500, "No JSON found in Gemini response");
          }
          parsed = JSON.parse(jsonMatch[0]);
        }
        providerUsed = "gemini";
      }

      clearTimeout(outerTimeoutId);

      // ── Step 3: Decrement quota & log ─────────────────────────────────
      // Decrement free scan count only for logged-in, non-subscribed users
      if (user && !isSubscribed) {
        user.freeScanCount = Math.max(0, user.freeScanCount - 1);
        await user.save();
      }

      // Save success log to DB
      try {
        const ScanLog = (await import("../lib/models/ScanLog.js")).default;
        const { getClientIp } = await import("../lib/middleware/rateLimiter.js");
        await ScanLog.create({
          user: user ? user._id : null,
          ipAddress: getClientIp(event),
          provider: providerUsed,
          status: "success"
        });
      } catch (dbLogErr) {
        console.error("Failed to save success scan log to database:", dbLogErr);
      }

      const logger = await import("../lib/logger.js");
      logger.info("Scan completed", {
        userId: user ? user._id : "guest",
        email: user ? user.email : "guest",
        provider: providerUsed,
      });

      return jsonResponse(200, parsed, headers);
    } catch (fetchError) {
      clearTimeout(outerTimeoutId);

      let finalError = fetchError;
      if (fetchError.name === "AbortError") {
        finalError = new HttpError(408, "Request timeout — all AI providers exceeded time limit");
      }

      // Save failed log to DB
      try {
        const ScanLog = (await import("../lib/models/ScanLog.js")).default;
        const { getClientIp } = await import("../lib/middleware/rateLimiter.js");
        await ScanLog.create({
          user: user ? user._id : null,
          ipAddress: getClientIp(event),
          provider: providerUsed,
          status: "failed",
          errorMessage: finalError.message
        });
      } catch (dbLogErr) {
        console.error("Failed to save failed scan log to database:", dbLogErr);
      }

      throw finalError;
    }
  } catch (error) {
    console.error("Gemini scan handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleGeminiScan;
