import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

// Use latest stable Gemini 1.5 Flash endpoint compatible with v1beta generateContent
const GOOGLE_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new HttpError(500, "Missing Gemini API Key");
    }

    const { mime_type, base64Image } = await parseJsonBody(event);

    if (!mime_type || !base64Image) {
      throw new HttpError(
        400,
        "Missing required fields: mime_type and base64Image"
      );
    }

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

    const response = await fetch(`${GOOGLE_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpError(
        response.status,
        "Gemini API request failed",
        errorText
      );
    }

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new HttpError(500, "Invalid response from Gemini API", data);
    }

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new HttpError(500, "No JSON found in response", textResponse);
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return jsonResponse(200, parsed, headers);
    } catch (error) {
      throw new HttpError(500, "Failed to parse JSON from Gemini response", {
        raw: textResponse,
        parseError: error.message,
      });
    }
  } catch (error) {
    console.error("Gemini scan handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleGeminiScan;
