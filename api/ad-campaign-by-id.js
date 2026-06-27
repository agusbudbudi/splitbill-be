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

export async function handleAdCampaignById(event, adId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    const { requireAdmin } = await import("../lib/middleware/auth.js");
    const adminUser = await requireAdmin(event);

    if (!adId) {
      throw new HttpError(400, "Ad campaign ID is required");
    }

    if (method === "GET") {
      const ad = await AdCampaign.findById(adId);
      if (!ad) {
        throw new HttpError(404, "Ad campaign tidak ditemukan");
      }
      return jsonResponse(200, { success: true, data: ad }, headers);
    }

    if (method === "PUT") {
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

      const ad = await AdCampaign.findById(adId);
      if (!ad) {
        throw new HttpError(404, "Ad campaign tidak ditemukan");
      }

      // Check slug uniqueness if id is being changed
      if (id && id !== ad.id) {
        const slugConflict = await AdCampaign.findOne({ id, _id: { $ne: adId } });
        if (slugConflict) {
          throw new HttpError(400, `Campaign dengan ID "${id}" sudah digunakan`);
        }
      }

      if (id !== undefined) ad.id = id;
      if (sponsorName !== undefined) ad.sponsorName = sponsorName;
      if (title !== undefined) ad.title = title || null;
      if (description !== undefined) ad.description = description || null;
      if (mediaType !== undefined) ad.mediaType = mediaType;
      if (mediaUrl !== undefined) ad.mediaUrl = mediaUrl;
      if (ctaUrl !== undefined) ad.ctaUrl = ctaUrl || null;
      if (ctaText !== undefined) ad.ctaText = ctaText || null;
      if (durationSeconds !== undefined) ad.durationSeconds = durationSeconds;
      if (isActive !== undefined) ad.isActive = isActive;
      if (order !== undefined) ad.order = order;
      ad.updatedBy = adminUser._id;

      await ad.save();

      return jsonResponse(
        200,
        { success: true, data: ad, message: "Ad campaign berhasil diperbarui" },
        headers
      );
    }

    if (method === "DELETE") {
      const ad = await AdCampaign.findByIdAndDelete(adId);
      if (!ad) {
        throw new HttpError(404, "Ad campaign tidak ditemukan");
      }
      return jsonResponse(
        200,
        { success: true, message: "Ad campaign berhasil dihapus" },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Ad campaign by-id handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleAdCampaignById;
