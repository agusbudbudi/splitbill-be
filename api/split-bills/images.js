import mongoose from "mongoose";
import crypto from "crypto";

import SplitBillRecord from "../../lib/models/SplitBillRecord.js";
import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";
import {
  validateMimeType,
  validateBase64ImageSize,
  validateRequestSize,
} from "../../lib/middleware/requestValidator.js";
import { getReceiptsStore, buildUploadDateFolder } from "../../lib/blobStore.js";
import { optimizeReceiptImage } from "../../lib/imageOptimizer.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES_PER_REQUEST = 10;

/**
 * Public projection of a receiptImages subdoc — deliberately omits blobKey,
 * the internal blob storage path.
 */
export function mapReceiptImage(recordId, img) {
  return {
    id: img.id,
    url: `/api/split-bills/${recordId}/images/${img.id}`,
    mimeType: img.mimeType,
    size: img.size,
    width: img.width ?? null,
    height: img.height ?? null,
    uploadedAt:
      img.uploadedAt instanceof Date ? img.uploadedAt.toISOString() : img.uploadedAt,
  };
}

export function mapReceiptImages(recordId, receiptImages) {
  return (receiptImages || []).map((img) => mapReceiptImage(recordId, img));
}

async function tryGetUser(event) {
  const rawHeaders = event?.headers;
  let authorization = null;
  if (rawHeaders && typeof rawHeaders.get === "function") {
    authorization = rawHeaders.get("authorization") || rawHeaders.get("Authorization");
  } else if (rawHeaders) {
    authorization = rawHeaders.authorization || rawHeaders.Authorization;
  }
  if (!authorization) return null;

  const { requireUser } = await import("../../lib/middleware/auth.js");
  return await requireUser(event);
}

/**
 * Guest-owned records (user=null) are open access; otherwise caller must own it.
 * Mirrors assertDraftAccess in drafts/[draftId].js — same access rule, different resource.
 */
function assertRecordAccess(record, userId) {
  if (!record) throw new HttpError(404, "Split bill tidak ditemukan");
  if (record.user === null || record.user === undefined) return;
  if (userId && record.user.toString() === userId.toString()) return;
  throw new HttpError(403, "Anda tidak memiliki akses ke split bill ini");
}

/**
 * POST /api/split-bills/:recordId/images
 * Body: { images: [{ mime_type, base64Image }, ...] }
 * Optimizes each image and stores it in Netlify Blobs under
 * split-bill/{upload date}/, then links it to the record.
 */
export async function handleUploadReceiptImages(event, recordId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new HttpError(400, "ID split bill tidak valid");
    }

    validateRequestSize(event);

    await connectDatabase();

    const user = await tryGetUser(event);
    const record = await SplitBillRecord.findById(recordId);
    assertRecordAccess(record, user?._id);

    const payload = await parseJsonBody(event);
    const images = Array.isArray(payload?.images) ? payload.images : null;
    if (!images || images.length === 0) {
      throw new HttpError(400, "Minimal satu foto struk wajib diupload");
    }
    if (images.length > MAX_IMAGES_PER_REQUEST) {
      throw new HttpError(400, `Maksimal ${MAX_IMAGES_PER_REQUEST} foto per upload`);
    }

    // Validate every item up front, before any blob writes — if one image in the
    // batch is bad, we must not have already stored its predecessors as orphaned
    // blobs with no DB reference (nothing below this point can throw for
    // validation reasons anymore).
    for (const item of images) {
      validateMimeType(item?.mime_type, ALLOWED_MIME_TYPES);
      validateBase64ImageSize(item?.base64Image);
    }

    const store = getReceiptsStore();
    const folder = buildUploadDateFolder();
    const uploadedDocs = [];

    for (const item of images) {
      const inputBuffer = Buffer.from(item.base64Image, "base64");
      const optimized = await optimizeReceiptImage(inputBuffer);

      const imageId = crypto.randomUUID();
      const blobKey = `split-bill/${folder}/${recordId}_${imageId}.webp`;

      await store.set(blobKey, optimized.buffer, {
        metadata: { recordId, mimeType: optimized.mimeType },
      });

      uploadedDocs.push({
        id: imageId,
        blobKey,
        mimeType: optimized.mimeType,
        size: optimized.buffer.length,
        width: optimized.width,
        height: optimized.height,
        uploadedAt: new Date(),
      });
    }

    record.receiptImages.push(...uploadedDocs);
    await record.save();

    return jsonResponse(
      201,
      {
        success: true,
        images: mapReceiptImages(recordId, uploadedDocs),
      },
      headers
    );
  } catch (error) {
    console.error("Upload receipt image handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

/**
 * GET /api/split-bills/:recordId/images/:imageId
 * Streams the optimized image bytes. If the blob was manually purged from
 * the store (regular cleanup), returns 404 instead of crashing — the DB
 * record keeps its metadata regardless.
 */
export async function handleGetReceiptImage(event, recordId, imageId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      throw new HttpError(400, "ID split bill tidak valid");
    }

    await connectDatabase();

    const record = await SplitBillRecord.findById(recordId)
      .select("receiptImages")
      .lean();
    if (!record) {
      throw new HttpError(404, "Split bill tidak ditemukan");
    }

    const imageMeta = (record.receiptImages || []).find((img) => img.id === imageId);
    if (!imageMeta) {
      throw new HttpError(404, "Foto struk tidak ditemukan");
    }

    const store = getReceiptsStore();
    let data = null;
    try {
      data = await store.get(imageMeta.blobKey, { type: "arrayBuffer" });
    } catch (blobErr) {
      console.error("Failed to read receipt image from blob store:", blobErr);
      data = null;
    }

    if (!data) {
      throw new HttpError(404, "Foto struk sudah tidak tersedia (mungkin telah dihapus)");
    }

    return new Response(data, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": imageMeta.mimeType || "image/webp",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Get receipt image handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}
