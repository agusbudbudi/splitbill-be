import crypto from "crypto";

import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import {
  validateMimeType,
  validateBase64ImageSize,
  validateRequestSize,
} from "../lib/middleware/requestValidator.js";
import { getLandingAssetsStore } from "../lib/blobStore.js";
import { optimizeLandingImage, optimizeOgImage } from "../lib/imageOptimizer.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ASSET_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/;
const CONTENT_TYPES = { webp: "image/webp", jpg: "image/jpeg" };

/**
 * POST /api/landing-assets — admin
 * Body: { mime_type, base64Image, variant? }
 * variant "og" crops to a 1200×630 JPEG for social share previews; default is
 * a resized WebP.
 * Stores the result in Netlify Blobs and returns its site-relative URL
 * (the web resolves it against the API origin), plus its pixel size so
 * next/image can reserve space and avoid layout shift.
 */
export async function handleUploadLandingAsset(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    validateRequestSize(event);

    await connectDatabase();
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    const payload = await parseJsonBody(event);
    validateMimeType(payload?.mime_type, ALLOWED_MIME_TYPES);
    validateBase64ImageSize(payload?.base64Image);

    const isOg = payload?.variant === "og";
    const input = Buffer.from(payload.base64Image, "base64");
    let optimized;
    try {
      optimized = isOg ? await optimizeOgImage(input) : await optimizeLandingImage(input);
    } catch (sharpErr) {
      if (sharpErr instanceof HttpError) throw sharpErr;
      // Corrupt/truncated files or non-image bytes behind an image MIME type
      console.error("Landing asset could not be decoded:", sharpErr);
      throw new HttpError(400, "File gambar rusak atau formatnya tidak didukung");
    }
    const key = `${crypto.randomUUID()}.${isOg ? "jpg" : "webp"}`;

    await getLandingAssetsStore().set(key, optimized.buffer, {
      metadata: { mimeType: optimized.mimeType, width: optimized.width, height: optimized.height },
    });

    return jsonResponse(
      201,
      {
        success: true,
        data: {
          url: `/api/landing-assets/${key}`,
          width: optimized.width,
          height: optimized.height,
          size: optimized.buffer.length,
        },
      },
      headers,
    );
  } catch (error) {
    console.error("Upload landing asset handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

/**
 * GET /api/landing-assets/:key — public
 * Keys are random per upload and never overwritten, so the response is
 * cacheable forever by browsers, the CDN and the Next.js image optimizer.
 * Reads only Netlify Blobs, so unlike other handlers it skips connectDatabase().
 */
export async function handleGetLandingAsset(event, key) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }
    if (!ASSET_KEY_PATTERN.test(key || "")) {
      throw new HttpError(404, "Gambar tidak ditemukan");
    }

    // A store error propagates as 5xx; only a missing key is a 404, so a Blobs
    // outage doesn't make crawlers and the image optimizer drop live assets
    const data = await getLandingAssetsStore().get(key, { type: "arrayBuffer" });
    if (!data) {
      throw new HttpError(404, "Gambar tidak ditemukan");
    }

    return new Response(data, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": CONTENT_TYPES[key.split(".").pop()],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Get landing asset handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

/** /api/landing-assets (upload) and /api/landing-assets/:key (read). */
export default async function handleLandingAssets(event, key) {
  return key ? handleGetLandingAsset(event, key) : handleUploadLandingAsset(event);
}
