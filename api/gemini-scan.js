import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { callGroq, callOpenRouter, isGroqCoolingDown, getGroqCooldownRemainingMs } from "../lib/ai-providers.js";

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
  `subtotal, tax, service_charge, discount, total_amount, payment_method, receipt_number, ` +
  `additional_charges[{label,amount}] (any other fee/charge/rounding line not already covered by tax, service_charge or discount, e.g. "pembulatan", "biaya parkir", "PB1" — do not duplicate tax/service_charge/discount here). ` +
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
        return { response: null, shouldFallback: true, reason: "timeout" };
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
      return { response: null, shouldFallback: true, reason: "429 quota exceeded" };
    }

    return { response, shouldFallback: false };
  }

  // Exhausted retries on 503 — trigger fallback
  console.warn("[Gemini] 503 after all retries — will fallback to Groq");
  return { response: null, shouldFallback: true, reason: "503 after retries" };
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
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

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
        // Bumped from 800: receipts with many line items were getting
        // truncated mid-array, producing unparseable JSON.
        maxOutputTokens: 2048,
        temperature: 0,
      },
    };

    // ── Timeout strategy ──────────────────────────────────────────────────
    // Total budget: 28s (2s buffer before Netlify's 30s hard limit)
    // OpenRouter and Groq (both free-tier) are raced in PARALLEL instead of
    // sequentially — previously a slow/congested OpenRouter ate its full 7s
    // timeout before Groq even started, stacking up to 15s before reaching
    // Gemini. Racing caps that wait at max(7s, 8s) = 8s worst case.
    // Gemini stays a strictly last-resort fallback (most reliable in
    // practice but costs money, so it's never hit unless both free
    // providers fail) and gets the most room: 11s.
    // Each provider is guarded individually so a slow one never starves the others.
    const OPENROUTER_TIMEOUT_MS = 7000;
    const GROQ_TIMEOUT_MS = 8000;
    const GEMINI_TIMEOUT_MS = 11000;

    // Outer guard: abort everything after 28s
    const outerController = new AbortController();
    const outerTimeoutId = setTimeout(() => outerController.abort(), 28000);

    let parsed = null;
    let providerUsed = "openrouter";
    // Captures the real provider-level failure reason (429/503/timeout/etc.)
    // so it survives into the ScanLog even though the client only ever sees
    // the generic "AI service temporarily unavailable" message.
    let openRouterFailureReason = null;
    let groqFailureReason = null;
    // Internal-only diagnostic string for the ScanLog entry — never attached
    // to the HttpError thrown to the client (HttpError.details bypasses the
    // production message-sanitization in toHttpError()).
    let internalFailureDetail = null;

    try {
      // ── Step 1+2: Race OpenRouter and Groq in parallel (both free-tier) ──
      // Whichever responds first wins; the other is aborted immediately so it
      // doesn't keep burning quota/time in the background. Only if BOTH fail
      // do we fall through to Gemini below.
      const raceCandidates = [];

      if (!openRouterApiKey) {
        openRouterFailureReason = "OPENROUTER_API_KEY not set";
        console.warn("[OpenRouter] OPENROUTER_API_KEY not set — skipping");
      } else {
        const openRouterController = new AbortController();
        const openRouterTimeoutId = setTimeout(() => openRouterController.abort(), OPENROUTER_TIMEOUT_MS);
        outerController.signal.addEventListener("abort", () => openRouterController.abort(), { once: true });

        raceCandidates.push({
          provider: "openrouter",
          controller: openRouterController,
          timeoutId: openRouterTimeoutId,
          promise: callOpenRouter(openRouterApiKey, base64Image, mime_type, openRouterController.signal),
        });
      }

      if (!groqApiKey) {
        groqFailureReason = "GROQ_API_KEY not set";
        console.warn("[Groq] GROQ_API_KEY not set — skipping");
      } else if (isGroqCoolingDown()) {
        groqFailureReason = `cooling down (TPD exhausted, ~${Math.ceil(getGroqCooldownRemainingMs() / 1000)}s left)`;
        console.warn(`[Groq] Skipping — known rate-limited for another ${Math.ceil(getGroqCooldownRemainingMs() / 1000)}s`);
      } else {
        const groqController = new AbortController();
        const groqTimeoutId = setTimeout(() => groqController.abort(), GROQ_TIMEOUT_MS);
        outerController.signal.addEventListener("abort", () => groqController.abort(), { once: true });

        raceCandidates.push({
          provider: "groq",
          controller: groqController,
          timeoutId: groqTimeoutId,
          promise: callGroq(groqApiKey, base64Image, mime_type, groqController.signal),
        });
      }

      if (raceCandidates.length > 0) {
        try {
          const winner = await Promise.any(
            raceCandidates.map(async (c) => {
              try {
                const result = await c.promise;
                return { provider: c.provider, result };
              } catch (err) {
                if (c.provider === "openrouter") openRouterFailureReason = err.message;
                else groqFailureReason = err.message;
                throw err;
              }
            })
          );

          parsed = winner.result;
          providerUsed = winner.provider;
          console.info(`[Race] ${winner.provider} won`);

          // Loser is still in flight — abort it, we don't need its result.
          raceCandidates
            .filter((c) => c.provider !== winner.provider)
            .forEach((c) => c.controller.abort());
        } catch {
          // AggregateError — both providers failed. Reasons already captured
          // above; fall through to the Gemini fallback below.
          console.warn("[Race] OpenRouter and Groq both failed — falling back to Gemini");
        } finally {
          raceCandidates.forEach((c) => clearTimeout(c.timeoutId));
        }
      }

      // ── Step 3: Fallback to Gemini if OpenRouter and Groq were unavailable (8s budget) ─
      if (!parsed) {
        // Set eagerly (not just on success) so a failed log entry correctly
        // attributes the failure to Gemini instead of defaulting to "groq".
        providerUsed = "gemini";
        console.info("[Fallback] Attempting Gemini 2.5 Flash-Lite...");

        const geminiController = new AbortController();
        const geminiTimeoutId = setTimeout(() => geminiController.abort(), GEMINI_TIMEOUT_MS);

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

        const { response, shouldFallback, reason } = geminiResult;

        if (shouldFallback || !response) {
          internalFailureDetail = `openrouter: ${openRouterFailureReason || "n/a"}; groq: ${groqFailureReason || "n/a"}; gemini: ${reason || "no response"}`;
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
          try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("no JSON object found");
            }
            parsed = JSON.parse(jsonMatch[0]);
          } catch (parseErr) {
            // Truncated/malformed model output (e.g. cut off mid-array by
            // maxOutputTokens). Never leak the raw parser message to the
            // client — log it internally instead.
            internalFailureDetail = `gemini JSON parse failed: ${parseErr.message}; finishReason=${data?.candidates?.[0]?.finishReason || "unknown"}`;
            console.error("[Gemini] Failed to parse response as JSON:", parseErr.message, textResponse?.slice(0, 500));
            throw new HttpError(500, "Could not read AI response — the receipt may be too complex. Please try again.");
          }
        }
        providerUsed = "gemini";
      }

      clearTimeout(outerTimeoutId);

      // Drop line items priced at Rp 0 — usually extraction noise (e.g. a
      // header/footer row misread as an item) rather than a real free item,
      // so there's nothing useful to split.
      if (Array.isArray(parsed?.items)) {
        parsed.items = parsed.items.filter((item) => {
          const price = parseFloat(String(item?.price).replace(/[^\d.-]/g, ""));
          return !(Number.isFinite(price) && price === 0);
        });
      }

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
          errorMessage: internalFailureDetail
            ? `${finalError.message} (${internalFailureDetail})`
            : finalError.message
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
