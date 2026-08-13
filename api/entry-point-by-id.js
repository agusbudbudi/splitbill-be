import { connectDatabase } from "../lib/db.js";
import EntryPointCard from "../lib/models/EntryPointCard.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

export async function handleEntryPointById(event, cardId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    const { requireAdmin } = await import("../lib/middleware/auth.js");
    const adminUser = await requireAdmin(event);

    if (!cardId) {
      throw new HttpError(400, "Entry point ID is required");
    }

    if (method === "GET") {
      const card = await EntryPointCard.findById(cardId);
      if (!card) {
        throw new HttpError(404, "Entry point card tidak ditemukan");
      }
      return jsonResponse(200, { success: true, data: card }, headers);
    }

    if (method === "PUT") {
      const body = await parseJsonBody(event);
      const {
        slug,
        imageUrl,
        imageAlt,
        title,
        subtitle,
        ctaText,
        url,
        footerText,
        footerIconUrl,
        ribbonText,
        placement,
        isActive,
        order,
      } = body;

      const card = await EntryPointCard.findById(cardId);
      if (!card) {
        throw new HttpError(404, "Entry point card tidak ditemukan");
      }

      if (slug && slug !== card.slug) {
        const slugConflict = await EntryPointCard.findOne({ slug, _id: { $ne: cardId } });
        if (slugConflict) {
          throw new HttpError(400, `Entry point dengan slug "${slug}" sudah digunakan`);
        }
      }

      if (slug !== undefined) card.slug = slug;
      if (imageUrl !== undefined) card.imageUrl = imageUrl;
      if (imageAlt !== undefined) card.imageAlt = imageAlt;
      if (title !== undefined) card.title = title;
      if (subtitle !== undefined) card.subtitle = subtitle || null;
      if (ctaText !== undefined) card.ctaText = ctaText || null;
      if (url !== undefined) card.url = url || null;
      if (footerText !== undefined) card.footerText = footerText || null;
      if (footerIconUrl !== undefined) card.footerIconUrl = footerIconUrl || null;
      if (ribbonText !== undefined) card.ribbonText = ribbonText || null;
      if (placement !== undefined) card.placement = placement;
      if (isActive !== undefined) card.isActive = isActive;
      if (order !== undefined) card.order = order;
      card.updatedBy = adminUser._id;

      await card.save();

      return jsonResponse(
        200,
        { success: true, data: card, message: "Entry point card berhasil diperbarui" },
        headers,
      );
    }

    if (method === "DELETE") {
      const card = await EntryPointCard.findByIdAndDelete(cardId);
      if (!card) {
        throw new HttpError(404, "Entry point card tidak ditemukan");
      }
      return jsonResponse(
        200,
        { success: true, message: "Entry point card berhasil dihapus" },
        headers,
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Entry point by-id handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleEntryPointById;
