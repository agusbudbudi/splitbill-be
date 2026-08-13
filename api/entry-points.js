import { connectDatabase } from "../lib/db.js";
import EntryPointCard from "../lib/models/EntryPointCard.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody, getQueryParams } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

export async function handleEntryPoints(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (method === "GET") {
      const { admin, placement } = getQueryParams(event);
      const isAdmin = admin === "true";

      if (isAdmin) {
        const { requireAdmin } = await import("../lib/middleware/auth.js");
        await requireAdmin(event);
        const filter = placement ? { placement } : {};
        const cards = await EntryPointCard.find(filter).sort({ order: 1, createdAt: -1 });
        return jsonResponse(200, { success: true, data: cards }, headers);
      }

      const filter = { isActive: true, ...(placement ? { placement } : {}) };
      const cards = await EntryPointCard.find(filter).sort({ order: 1, createdAt: -1 });
      return jsonResponse(200, { success: true, data: cards }, headers);
    }

    if (method === "POST") {
      const { requireAdmin } = await import("../lib/middleware/auth.js");
      const adminUser = await requireAdmin(event);

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

      if (!slug || !imageUrl || !imageAlt || !title) {
        throw new HttpError(400, "slug, imageUrl, imageAlt, dan title wajib diisi");
      }

      const existing = await EntryPointCard.findOne({ slug });
      if (existing) {
        throw new HttpError(400, `Entry point dengan slug "${slug}" sudah ada`);
      }

      const card = await EntryPointCard.create({
        slug,
        imageUrl,
        imageAlt,
        title,
        subtitle: subtitle || null,
        ctaText: ctaText || null,
        url: url || null,
        footerText: footerText || null,
        footerIconUrl: footerIconUrl || null,
        ribbonText: ribbonText || null,
        placement: placement || "homepage-member",
        isActive: isActive !== undefined ? isActive : true,
        order: order ?? 0,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      });

      return jsonResponse(
        201,
        { success: true, data: card, message: "Entry point card berhasil dibuat" },
        headers,
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Entry points handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleEntryPoints;
