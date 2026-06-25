/**
 * AI Provider abstraction layer for receipt/bill scanning.
 * Currently supports:
 *  - Groq (Llama 4 Scout) — fallback when Gemini is unavailable
 *
 * Token optimization notes:
 *  - GROQ_PROMPT is intentionally compact (~80 tokens vs ~230 for full schema)
 *  - image_url detail:"low" reduces vision tokens from ~1500 → ~280 per image
 *  - max_tokens:800 is sufficient (observed output is ~260 tokens)
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

/**
 * Shared prompt used by Gemini (optimized to compact format).
 * Groq uses the compact GROQ_PROMPT below instead.
 */
export const SHARED_PROMPT =
  `Extract receipt/bill data as JSON with these keys: ` +
  `merchant_name, date(YYYY-MM-DD), time(HH:MM), ` +
  `items[{name,quantity,price,total}], ` +
  `subtotal, tax, service_charge, discount, total_amount, payment_method, receipt_number. ` +
  `Use null for missing fields. Output ONLY raw JSON, no markdown.`;


/**
 * Compact prompt for Groq — same fields, ~65% fewer tokens (~80 vs ~230).
 * Uses a single-line schema hint instead of a full formatted example.
 * Llama 4 Scout understands compact instructions well.
 */
const GROQ_PROMPT =
  `Extract receipt data as compact JSON with these keys: ` +
  `merchant_name, date(YYYY-MM-DD), time(HH:MM), ` +
  `items[{name,quantity,price,total}], ` +
  `subtotal, tax, service_charge, discount, total_amount, payment_method, receipt_number. ` +
  `Use null for missing fields. Output raw JSON only, no markdown.`;

// Groq base64 hard limit per request
const GROQ_MAX_BASE64_BYTES = 4 * 1024 * 1024; // 4MB

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

  return JSON.parse(jsonMatch[0]);
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
    max_tokens: 800,   // Observed output ~260 tokens; 800 gives comfortable headroom
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
