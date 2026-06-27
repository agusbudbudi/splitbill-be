import { connectDatabase } from "../lib/db.js";
import AdCampaign from "../lib/models/AdCampaign.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

export async function handleAdCampaigns(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (method === "GET") {
      const query = event.url
        ? Object.fromEntries(new URL(event.url).searchParams)
        : event.queryStringParameters || {};

      const isAdmin = query.admin === "true";

      if (isAdmin) {
        // Admin access: requires admin auth, returns all ads
        const { requireAdmin } = await import("../lib/middleware/auth.js");
        await requireAdmin(event);
        const ads = await AdCampaign.find().sort({ order: 1, createdAt: -1 });
        return jsonResponse(200, { success: true, data: ads }, headers);
      }

      // Public access: only active ads, sorted by order
      const ads = await AdCampaign.find({ isActive: true }).sort({
        order: 1,
        createdAt: -1,
      });
      return jsonResponse(200, { success: true, data: ads }, headers);
    }

    if (method === "POST") {
      const { requireAdmin } = await import("../lib/middleware/auth.js");
      const adminUser = await requireAdmin(event);

      const body = await parseJsonBody(event);
      const {
        id,
        sponsorName,
        title,
        description,
        mediaType,
        mediaUrl,
        ctaUrl,
        ctaText,
        durationSeconds,
        isActive,
        order,
      } = body;

      if (!id || !sponsorName || !mediaType || !mediaUrl) {
        throw new HttpError(400, "id, sponsorName, mediaType, dan mediaUrl wajib diisi");
      }

      const existing = await AdCampaign.findOne({ id });
      if (existing) {
        throw new HttpError(400, `Campaign dengan ID "${id}" sudah ada`);
      }

      const ad = await AdCampaign.create({
        id,
        sponsorName,
        title: title || null,
        description: description || null,
        mediaType,
        mediaUrl,
        ctaUrl: ctaUrl || null,
        ctaText: ctaText || null,
        durationSeconds: durationSeconds ?? 10,
        isActive: isActive !== undefined ? isActive : true,
        order: order ?? 0,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      });

      return jsonResponse(
        201,
        { success: true, data: ad, message: "Ad campaign berhasil dibuat" },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Ad campaigns handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAdCampaigns;
