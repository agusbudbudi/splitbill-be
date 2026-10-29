import mongoose from "mongoose";

import { connectDatabase } from "../lib/db.js";
import Faq from "../lib/models/Faq.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { markFaqsConfigured, normalizeFaqInput, revalidateFaqPages } from "./faqs.js";

/**
 * PUT    /api/faqs/:id — admin, partial update
 * DELETE /api/faqs/:id — admin
 */
export async function handleFaqById(event, id) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "ID FAQ tidak valid");
    }

    await connectDatabase();
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    const adminUser = await requireAdmin(event);

    if (method === "PUT") {
      const body = await parseJsonBody(event);
      const fields = normalizeFaqInput(body, { partial: true });
      const faq = await Faq.findByIdAndUpdate(
        id,
        { $set: { ...fields, updatedAt: new Date(), updatedBy: adminUser._id } },
        { new: true, runValidators: true },
      ).lean();
      if (!faq) throw new HttpError(404, "FAQ tidak ditemukan");
      const revalidated = await revalidateFaqPages();
      return jsonResponse(200, { success: true, data: faq, revalidated, message: "FAQ tersimpan" }, headers);
    }

    if (method === "DELETE") {
      // Before deleting: once the last FAQ is gone the flag is what keeps the
      // web from bringing back its static FAQs. Only for an existing FAQ, so a
      // 404 delete can't hide the static FAQs on a never-configured setup.
      if (!(await Faq.exists({ _id: id }))) throw new HttpError(404, "FAQ tidak ditemukan");
      await markFaqsConfigured();
      const faq = await Faq.findByIdAndDelete(id).lean();
      if (!faq) throw new HttpError(404, "FAQ tidak ditemukan");
      const revalidated = await revalidateFaqPages();
      return jsonResponse(200, { success: true, revalidated, message: "FAQ dihapus" }, headers);
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("FAQ by id handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleFaqById;
