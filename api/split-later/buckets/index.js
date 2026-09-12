import SplitLaterBucket, { BUCKET_TYPES } from "../../../lib/models/SplitLaterBucket.js";
import User from "../../../lib/models/User.js";
import { requireUser } from "../../../lib/middleware/auth.js";
import { connectDatabase } from "../../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../../lib/http.js";
import { parseJsonBody } from "../../../lib/parsers.js";
import { HttpError, toHttpError } from "../../../lib/errors.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toIsoOrNull(value) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

export function mapBucket(doc) {
  const obj = doc.toObject ? doc.toObject({ versionKey: false }) : doc;

  const ownerId = (() => {
    if (doc.user && typeof doc.user.toString === "function") {
      return doc.user._id ? doc.user._id.toString() : doc.user.toString();
    }
    return typeof obj.user === "string" ? obj.user : undefined;
  })();

  const owner =
    doc.user && typeof doc.user === "object" && doc.user.name
      ? { id: doc.user._id.toString(), name: doc.user.name, email: doc.user.email }
      : null;

  return {
    id: obj._id.toString(),
    ownerId: ownerId ?? "",
    owner,
    title: obj.title,
    emoji: obj.emoji,
    bucketType: obj.bucketType,
    participants: obj.participants || [],
    startDate: toIsoOrNull(obj.startDate),
    endDate: toIsoOrNull(obj.endDate),
    status: obj.status,
    receipts: (obj.receipts || []).map((r) => ({
      id: r._id.toString(),
      imageUrl: r.imageUrl,
      merchant: r.merchant || null,
      totalAmount: r.totalAmount ?? null,
      status: r.status,
      splitBillId: r.splitBillId ? r.splitBillId.toString() : null,
      notes: r.notes || null,
      createdAt: toIsoOrNull(r.createdAt),
    })),
    createdAt: toIsoOrNull(obj.createdAt),
    updatedAt: toIsoOrNull(obj.updatedAt),
  };
}

export function sanitizeBucketPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Payload tidak valid");
  }

  const result = {};

  if (!partial || payload.title !== undefined) {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) {
      throw new HttpError(400, "Nama bucket wajib diisi");
    }
    result.title = title;
  }

  if (!partial || payload.emoji !== undefined) {
    const emoji = typeof payload.emoji === "string" ? payload.emoji.trim() : "";
    if (!emoji) {
      throw new HttpError(400, "Emoji bucket wajib diisi");
    }
    result.emoji = emoji;
  }

  if (!partial || payload.bucketType !== undefined) {
    if (!BUCKET_TYPES.includes(payload.bucketType)) {
      throw new HttpError(400, "Tipe bucket tidak valid");
    }
    result.bucketType = payload.bucketType;
  }

  if (!partial || payload.participants !== undefined) {
    if (!Array.isArray(payload.participants)) {
      throw new HttpError(400, "Daftar peserta tidak valid");
    }
    const participants = payload.participants.map((name) => {
      const trimmed = typeof name === "string" ? name.trim() : "";
      if (!trimmed) {
        throw new HttpError(400, "Nama peserta tidak boleh kosong");
      }
      return trimmed;
    });
    // Quick Capture can create a bucket with nobody assigned yet (filled in
    // later from the bucket detail page) — only reject the "exactly 1"
    // in-between state the rest of the app already treats as invalid.
    if (participants.length === 1) {
      throw new HttpError(400, "Minimal 2 peserta diperlukan");
    }
    result.participants = participants;
  }

  if (payload.startDate !== undefined) {
    if (payload.startDate && Number.isNaN(Date.parse(payload.startDate))) {
      throw new HttpError(400, "Tanggal mulai tidak valid");
    }
    result.startDate = payload.startDate ? new Date(payload.startDate) : undefined;
  }

  if (payload.endDate !== undefined) {
    if (payload.endDate && Number.isNaN(Date.parse(payload.endDate))) {
      throw new HttpError(400, "Tanggal selesai tidak valid");
    }
    result.endDate = payload.endDate ? new Date(payload.endDate) : undefined;
  }

  if (payload.status !== undefined) {
    if (payload.status !== "active" && payload.status !== "done") {
      throw new HttpError(400, "Status bucket tidak valid");
    }
    result.status = payload.status;
  }

  return result;
}

export async function handleSplitLaterBuckets(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    const user = await requireUser(event);

    if (method === "GET") {
      const url = new URL(event.url || `http://localhost${event.path || ""}`);
      // No page/limit given → return full list unpaginated, preserving the
      // original response shape for existing callers (e.g. the Quick Capture
      // bucket picker) that expect every bucket in one array.
      const isPaginated = url.searchParams.has("page") || url.searchParams.has("limit");
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);
      const skip = (page - 1) * limit;

      const search = url.searchParams.get("search") || "";
      const searchRegex = search ? { $regex: escapeRegex(search), $options: "i" } : null;

      // Date range filter on createdAt
      const startDate = url.searchParams.get("startDate") || "";
      const endDate = url.searchParams.get("endDate") || "";
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      const createdAtFilter =
        Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

      const statusParam = url.searchParams.get("status") || "all";
      const statusFilter =
        statusParam === "active"
          ? { status: "active" }
          : statusParam === "done"
          ? { status: "done" }
          : {};

      let query = user.isAdmin
        ? { ...statusFilter, ...createdAtFilter }
        : { user: user._id, ...statusFilter, ...createdAtFilter };

      if (searchRegex) {
        const searchConditions = [{ title: searchRegex }, { participants: searchRegex }];

        if (user.isAdmin) {
          const matchingUsers = await User.find({
            $or: [{ name: searchRegex }, { email: searchRegex }],
          }).select("_id").lean();
          if (matchingUsers.length > 0) {
            searchConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
          }
        }

        query = { ...query, $or: searchConditions };
      }

      const [totalItems, buckets] = await Promise.all([
        SplitLaterBucket.countDocuments(query),
        (() => {
          let q = SplitLaterBucket.find(query).sort({ updatedAt: -1 });
          if (isPaginated) q = q.skip(skip).limit(limit);
          if (user.isAdmin) q = q.populate("user", "name email");
          return q;
        })(),
      ]);

      const totalPages = isPaginated ? Math.ceil(totalItems / limit) : 1;

      return jsonResponse(
        200,
        {
          success: true,
          buckets: buckets.map(mapBucket),
          pagination: {
            totalItems,
            totalPages,
            currentPage: isPaginated ? page : 1,
            limit: isPaginated ? limit : totalItems,
          },
        },
        headers,
      );
    }

    if (method === "POST") {
      const payload = await parseJsonBody(event);
      const sanitized = sanitizeBucketPayload(payload);

      const bucket = await SplitLaterBucket.create({
        ...sanitized,
        user: user._id,
      });

      return jsonResponse(201, { success: true, bucket: mapBucket(bucket) }, headers);
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Split later buckets handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleSplitLaterBuckets;
