/**
 * AI Provider abstraction layer for receipt/bill scanning.
 * Fallback chain (see api/gemini-scan.js): OpenRouter → Groq → Gemini.
 *
 * Token optimization notes:
 *  - GROQ_PROMPT is intentionally compact (~80 tokens vs ~230 for full schema)
 *  - image_url detail:"low" (Groq only) reduces vision tokens from ~1500 → ~280 per image
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-4-scout was deprecated/removed from Groq's catalog (was returning
// 404 model_not_found on every call — silently killing this fallback hop).
// qwen/qwen3.6-27b is the only vision-capable model left on this account.
const GROQ_MODEL = "qwen/qwen3.6-27b";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemma-4-31b-it:free";

/**
 * Shared prompt used by Gemini (optimized to compact format).
 * Groq uses the compact GROQ_PROMPT below instead.
 */
export const SHARED_PROMPT =
  `Extract receipt/bill data as JSON with these keys: ` +
  `merchant_name, date(YYYY-MM-DD), time(HH:MM), ` +
  `items[{name,quantity,price,total}] (price=total=the line amount printed on receipt for that quantity, NOT divided per unit), ` +
  `subtotal, tax, service_charge, discount, total_amount, payment_method, receipt_number, ` +
  `additional_charges[{label,amount}] (other fee/rounding line not covered by tax/service_charge/discount, e.g. "pembulatan" — don't duplicate those here). ` +
  `Use null for missing fields. Output ONLY raw JSON, no markdown.`;


/**
 * Compact prompt for Groq — same fields, ~65% fewer tokens (~80 vs ~230).
 * Uses a single-line schema hint instead of a full formatted example.
 * Qwen 3.6 27B understands compact instructions well.
 */
const GROQ_PROMPT =
  `Extract receipt data as compact JSON with these keys: ` +
  `merchant_name, date(YYYY-MM-DD), time(HH:MM), ` +
  `items[{name,quantity,price,total}] (price=total=line amount printed on receipt for that qty, NOT per unit), ` +
  `subtotal, tax, service_charge, discount, total_amount, payment_method, receipt_number, ` +
  `additional_charges[{label,amount}] (other fee/rounding not in tax/service_charge/discount, e.g. "pembulatan" — don't duplicate those here). ` +
  `Use null for missing fields. Output raw JSON only, no markdown.`;

// Groq base64 hard limit per request
const GROQ_MAX_BASE64_BYTES = 4 * 1024 * 1024; // 4MB

// In-memory circuit breaker: when Groq returns a daily token-quota 429, every
// subsequent call fails the same way until the quota window resets — retrying
// still costs a full image upload + round trip for a guaranteed failure.
// Cache the cooldown deadline (persists across warm Lambda invocations,
// resets harmlessly on cold start) so callers can skip the wasted call.
let groqCooldownUntil = 0;

/**
 * @returns {boolean} true if Groq is known to be rate-limited right now
 */
export function isGroqCoolingDown() {
  return Date.now() < groqCooldownUntil;
}

/**
 * @returns {number} ms remaining in the cooldown window (0 if not cooling down)
 */
export function getGroqCooldownRemainingMs() {
  return Math.max(0, groqCooldownUntil - Date.now());
}

/**
 * Parses Groq's rate-limit error body for "Please try again in 6m36.4s"
 * style messages and returns the wait time in ms, or null if not found.
 *
 * @param {string} errorText
 * @returns {number|null}
 */
function parseGroqRetryAfterMs(errorText) {
  const match = errorText.match(/try again in (?:(\d+)m)?([\d.]+)s/i);
  if (!match) return null;
  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = parseFloat(match[2]);
  return (minutes * 60 + seconds) * 1000;
}

/**
 * Estimate actual binary size from a base64 string.
 * base64 overhead is ~33%, so binary ≈ (len * 3) / 4.
 *
 * @param {string} base64String
 * @returns {number} estimated byte size
 */
function estimateBase64Size(base64String) {
  return (base64String.length * 3) / 4;
}

/**
 * Guard: ensure the image fits within Groq's 4MB base64 limit.
 * True server-side image compression requires native binaries (sharp, etc.)
 * which are not available in this serverless environment.
 * The validation layer (requestValidator.js) already caps incoming images
 * at 4MB, so this is a final safety check.
 *
 * @param {string} base64String - raw base64 image data
 * @returns {{ base64: string, wasCompressed: boolean }}
 */
export function prepareImageForGroq(base64String) {
  const estimatedSize = estimateBase64Size(base64String);

  if (estimatedSize <= GROQ_MAX_BASE64_BYTES) {
    return { base64: base64String, wasCompressed: false };
  }

  // Should not normally reach here after the 4MB validation above.
  throw new Error(
    `Image too large for Groq (estimated ${(estimatedSize / 1024 / 1024).toFixed(2)}MB, max 4MB). ` +
      `Please compress the image before uploading.`
  );
}

/**
 * Extract the JSON block from a raw text response.
 * Handles models that wrap JSON in markdown code fences.
 *
 * @param {string} text
 * @returns {object} parsed JSON
 */
export function extractJsonFromResponse(text) {
  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const rawJson = fenceMatch ? fenceMatch[1].trim() : text;

  const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    // Likely truncated mid-array/object by max_tokens on a large receipt.
    throw new Error(`Malformed JSON in Groq response (possibly truncated): ${parseErr.message}`);
  }
}

/**
 * Call Groq API with a base64 image using the OpenAI-compatible
 * chat completions endpoint.
 *
 * Token optimizations applied:
 *  1. GROQ_PROMPT        — compact ~80-token prompt (vs ~230 for SHARED_PROMPT)
 *  2. detail:"low"       — reduces image vision tokens from ~1500 → ~280
 *  3. max_tokens:800     — sufficient for observed ~260-token output
 *
 * @param {string} apiKey - GROQ_API_KEY
 * @param {string} base64Image - raw base64 image data (no data URL prefix)
 * @param {string} mimeType - e.g. "image/jpeg"
 * @param {AbortSignal} signal - AbortController signal for timeout
 * @returns {object} parsed receipt JSON
 */
export async function callGroq(apiKey, base64Image, mimeType, signal) {
  const { base64 } = prepareImageForGroq(base64Image);

  const dataUrl = `data:${mimeType};base64,${base64}`;

  const payload = {
    model: GROQ_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: GROQ_PROMPT,
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              // "low" detail: ~280 vision tokens vs ~1500 for "high"
              // Sufficient for receipt/text-heavy images at normal upload resolution
              detail: "low",
            },
          },
        ],
      },
    ],
    max_tokens: 2000,  // Bumped from 800 — receipts with many line items were truncated mid-JSON
    temperature: 0.1,  // Low temperature for deterministic structured extraction
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 429) {
      const retryAfterMs = parseGroqRetryAfterMs(errorText);
      if (retryAfterMs) {
        groqCooldownUntil = Date.now() + retryAfterMs;
        console.warn(`[Groq] Rate limited — cooling down for ${Math.ceil(retryAfterMs / 1000)}s`);
      }
    }

    // Sanitize API key from error output
    const sanitized = errorText.replace(apiKey, "[REDACTED]");
    throw new Error(`Groq API error ${response.status}: ${sanitized}`);
  }

  const data = await response.json();
  const textResponse = data?.choices?.[0]?.message?.content;

  if (!textResponse) {
    throw new Error("Empty response from Groq API");
  }

  // Log token usage for monitoring
  const usage = data?.usage;
  if (usage) {
    console.info(
      `[Groq] Token usage — prompt: ${usage.prompt_tokens}, ` +
      `completion: ${usage.completion_tokens}, ` +
      `total: ${usage.total_tokens}`
    );
  }

  return extractJsonFromResponse(textResponse);
}

/**
 * Call OpenRouter API with a base64 image using the OpenAI-compatible
 * chat completions endpoint. Used as the primary provider.
 *
 * @param {string} apiKey - OPENROUTER_API_KEY
 * @param {string} base64Image - raw base64 image data (no data URL prefix)
 * @param {string} mimeType - e.g. "image/jpeg"
 * @param {AbortSignal} signal - AbortController signal for timeout
 * @returns {object} parsed receipt JSON
 */
export async function callOpenRouter(apiKey, base64Image, mimeType, signal) {
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const payload = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: GROQ_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
              // "low" detail: same trick as Groq below — cuts vision tokens
              // (~1500 → ~280) since receipts are text-heavy, not detail-heavy.
              detail: "low",
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
    temperature: 0.1,
  };

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://splitbill.my.id",
      "X-Title": "SplitBill Receipt Scan",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const sanitized = errorText.replace(apiKey, "[REDACTED]");
    throw new Error(`OpenRouter API error ${response.status}: ${sanitized}`);
  }

  const data = await response.json();
  const textResponse = data?.choices?.[0]?.message?.content;

  if (!textResponse) {
    throw new Error("Empty response from OpenRouter API");
  }

  const usage = data?.usage;
  if (usage) {
    console.info(
      `[OpenRouter] Token usage — prompt: ${usage.prompt_tokens}, ` +
      `completion: ${usage.completion_tokens}, ` +
      `total: ${usage.total_tokens}`
    );
  }

  return extractJsonFromResponse(textResponse);
}
