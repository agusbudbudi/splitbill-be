import { connectDatabase } from "../lib/db.js";
import LandingPage from "../lib/models/LandingPage.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import {
  DEFAULT_LANDING_CONTENT,
  ALWAYS_VISIBLE_SECTIONS,
  HIDDEN_BY_DEFAULT_SECTIONS,
  LAYOUT_SECTIONS,
  normalizeLandingContent,
  withFeatureShowcaseImages,
} from "../lib/landingPage.js";
import { revalidateWeb } from "../lib/revalidateWeb.js";

const HOMEPAGE_SLUG = "homepage";

// Sections missing from a stored document (e.g. added in a later release) fall
// back to their defaults, so the public response always has every section.
// Layout entries for such sections are inserted next to their default
// neighbor with their default visibility, keeping the stored order otherwise.
function withDefaults(content) {
  const merged = { ...DEFAULT_LANDING_CONTENT, ...(content || {}) };
  const sections = (merged.layout?.sections || []).filter((s) => LAYOUT_SECTIONS.includes(s?.key));
  LAYOUT_SECTIONS.forEach((key, defaultIndex) => {
    if (sections.some((s) => s.key === key)) return;
    // Insert right after the closest preceding section (in default order) that is present
    const anchor = LAYOUT_SECTIONS.slice(0, defaultIndex).reverse().find((k) => sections.some((s) => s.key === k));
    const at = anchor ? sections.findIndex((s) => s.key === anchor) + 1 : 0;
    sections.splice(at, 0, { key, visible: !HIDDEN_BY_DEFAULT_SECTIONS.includes(key) });
  });
  return {
    ...withFeatureShowcaseImages(merged),
    // Stored seo predating the extra SEO fields: fill them from the defaults
    seo: { ...DEFAULT_LANDING_CONTENT.seo, ...merged.seo },
    // A stored layout may hide a section that has since become a navbar target
    layout: {
      sections: sections.map((s) => (ALWAYS_VISIBLE_SECTIONS.includes(s.key) ? { ...s, visible: true } : s)),
    },
  };
}

/**
 * GET /api/landing-page — public, homepage content (defaults until first save).
 *   Not cached in memory: a per-instance cache could hand the post-save
 *   revalidate a stale copy, which the web would then hold for an hour.
 * PUT /api/landing-page — admin, replaces the whole content and goes live.
 */
export async function handleLandingPage(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (method === "GET") {
      const doc = await LandingPage.findOne({ slug: HOMEPAGE_SLUG }).lean();
      return jsonResponse(
        200,
        {
          success: true,
          data: {
            content: withDefaults(doc?.content),
            updatedAt: doc?.updatedAt || null,
            isDefault: !doc,
          },
        },
        headers,
      );
    }

    if (method === "PUT") {
      const { requireAdmin } = await import("../lib/middleware/auth.js");
      const adminUser = await requireAdmin(event);

      const body = await parseJsonBody(event);
      const content = normalizeLandingContent(body?.content);

      const doc = await LandingPage.findOneAndUpdate(
        { slug: HOMEPAGE_SLUG },
        { $set: { content, updatedAt: new Date(), updatedBy: adminUser._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();

      const revalidated = await revalidateWeb({ paths: ["/"], tags: ["landing-page"] });

      return jsonResponse(
        200,
        {
          success: true,
          data: { content: withDefaults(doc.content), updatedAt: doc.updatedAt, isDefault: false },
          revalidated,
          message: revalidated
            ? "Landing page tersimpan dan sudah live"
            : "Landing page tersimpan, tampil di web maksimal 1 jam lagi",
        },
        headers,
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Landing page handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleLandingPage;
