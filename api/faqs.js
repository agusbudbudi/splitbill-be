import crypto from "crypto";
import mongoose from "mongoose";

import { connectDatabase } from "../lib/db.js";
import Faq from "../lib/models/Faq.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody, getQueryParams } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { DEFAULT_FAQS, FAQ_CATEGORIES } from "../lib/faqDefaults.js";
import { revalidateWeb } from "../lib/revalidateWeb.js";

const ORDER_STEP = 10;

// Every web page that renders FAQs. Must stay within the web's revalidate
// allowlist (splitbill-web src/app/api/revalidate/route.ts).
const FAQ_REVALIDATE = {
  tags: ["faqs"],
  paths: [
    "/",
    "/faq",
    "/split-bill",
    "/split-bill/cara-pakai",
    "/split-later/cara-pakai",
    "/split-bill-liburan",
    "/shared-goals",
    "/shared-goals/cara-pakai",
    "/collect-money",
    "/invoice",
  ],
};

export function revalidateFaqPages() {
  return revalidateWeb(FAQ_REVALIDATE);
}

/** Shape splitbill-web expects (matches its FAQItem type; `key` → `id`). */
function toPublicFaq(faq) {
  return {
    id: faq.key,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    showOnLanding: faq.showOnLanding,
  };
}

/**
 * Validates and cleans a create/update payload. With `partial`, only the
 * fields present are checked (PUT); otherwise question/answer/category are
 * required (POST).
 */
export function normalizeFaqInput(body, { partial = false } = {}) {
  const out = {};
  const has = (field) => body?.[field] !== undefined;

  for (const [field, label, max] of [
    ["question", "Pertanyaan", 200],
    ["answer", "Jawaban", 2000],
  ]) {
    if (!partial || has(field)) {
      const value = typeof body?.[field] === "string" ? body[field].trim() : "";
      if (!value) throw new HttpError(400, `${label} wajib diisi`);
      if (value.length > max) throw new HttpError(400, `${label} maksimal ${max} karakter`);
      out[field] = value;
    }
  }
  if (!partial || has("category")) {
    if (!FAQ_CATEGORIES.includes(body?.category)) {
      throw new HttpError(400, `Kategori tidak dikenal: "${body?.category}"`);
    }
    out.category = body.category;
  }
  for (const field of ["showOnLanding", "isActive"]) {
    if (has(field)) out[field] = body[field] === true;
  }
  return out;
}

/**
 * GET  /api/faqs                   — public, active FAQs in display order
 * GET  /api/faqs?admin=true        — admin, all FAQs
 * POST /api/faqs                   — admin, create
 * POST /api/faqs/import-defaults   — admin, seed from DEFAULT_FAQS (empty collection only)
 * POST /api/faqs/reorder           — admin, body { ids: [...] } in the new order
 */
export async function handleFaqs(event, action) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (method === "GET" && !action) {
      const { admin } = getQueryParams(event);
      if (admin === "true") {
        const { requireAdmin } = await import("../lib/middleware/auth.js");
        await requireAdmin(event);
        const faqs = await Faq.find({}).sort({ order: 1, createdAt: 1 }).lean();
        return jsonResponse(200, { success: true, data: faqs }, headers);
      }
      const faqs = await Faq.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
      // `configured` tells the web an empty list is intentional (every FAQ
      // deactivated/deleted) rather than "CMS not set up, use static FAQs"
      const configured = faqs.length > 0 || Boolean(await Faq.exists({}));
      return jsonResponse(200, { success: true, data: faqs.map(toPublicFaq), configured }, headers);
    }

    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    const { requireAdmin } = await import("../lib/middleware/auth.js");
    const adminUser = await requireAdmin(event);

    if (action === "import-defaults") {
      // Import only into an empty collection: the web treats an empty list as
      // "CMS not set up" and serves its static FAQs, so a partial collection
      // would silently replace all of them.
      if ((await Faq.countDocuments()) > 0) {
        throw new HttpError(409, "FAQ sudah ada, import default hanya untuk koleksi kosong");
      }
      await Faq.insertMany(
        DEFAULT_FAQS.map((faq, i) => ({
          ...faq,
          isActive: true,
          order: (i + 1) * ORDER_STEP,
          createdBy: adminUser._id,
          updatedBy: adminUser._id,
        })),
      );
      const revalidated = await revalidateFaqPages();
      return jsonResponse(
        201,
        { success: true, message: `${DEFAULT_FAQS.length} FAQ default berhasil diimport`, revalidated },
        headers,
      );
    }

    if (action === "reorder") {
      const body = await parseJsonBody(event);
      const ids = Array.isArray(body?.ids) ? body.ids : null;
      if (!ids || ids.length === 0 || ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        throw new HttpError(400, "ids harus berupa list ID FAQ");
      }
      // A partial or stale list (e.g. another admin added a FAQ meanwhile)
      // would renumber only some FAQs and collide with the rest's order
      const allIds = (await Faq.find({}).select("_id").lean()).map((faq) => String(faq._id));
      const sameSet =
        new Set(ids.map(String)).size === ids.length &&
        ids.length === allIds.length &&
        allIds.every((id) => ids.includes(id));
      if (!sameSet) {
        throw new HttpError(409, "Daftar FAQ sudah berubah, muat ulang halaman lalu atur ulang urutannya");
      }
      await Faq.bulkWrite(
        ids.map((id, i) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { order: (i + 1) * ORDER_STEP, updatedAt: new Date(), updatedBy: adminUser._id } },
          },
        })),
      );
      const revalidated = await revalidateFaqPages();
      return jsonResponse(200, { success: true, revalidated }, headers);
    }

    if (action) {
      throw new HttpError(404, "Not found");
    }

    const body = await parseJsonBody(event);
    const fields = normalizeFaqInput(body);
    const last = await Faq.findOne({}).sort({ order: -1 }).select("order").lean();
    const faq = await Faq.create({
      ...fields,
      key: crypto.randomUUID().slice(0, 8),
      order: (last?.order || 0) + ORDER_STEP,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const revalidated = await revalidateFaqPages();
    return jsonResponse(
      201,
      { success: true, data: faq, revalidated, message: "FAQ berhasil dibuat" },
      headers,
    );
  } catch (error) {
    console.error("FAQs handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleFaqs;
