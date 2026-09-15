import { connectDatabase } from "../../lib/db.js";
import UserLevel from "../../lib/models/UserLevel.js";
import {
  sanitizeLevelRules,
  sanitizeLevelBenefits,
  assertLevelOrderAvailable,
} from "../../lib/userLevel.js";
import { validateBase64ImageSize } from "../../lib/middleware/requestValidator.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody, getQueryParams } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

const MAX_ICON_SIZE_BYTES = 1 * 1024 * 1024; // 1MB — badge icon, jauh di bawah limit gambar biasa

export async function handleLevels(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (method === "GET") {
      const { includeInactive } = getQueryParams(event);

      if (includeInactive === "true") {
        const { requireAdmin } = await import("../../lib/middleware/auth.js");
        await requireAdmin(event);
        const levels = await UserLevel.find({}).sort({ order: -1 });
        return jsonResponse(200, { success: true, data: levels }, headers);
      }

      const levels = await UserLevel.find({ isActive: true }).sort({
        order: -1,
      });
      return jsonResponse(200, { success: true, data: levels }, headers);
    }

    if (method === "POST") {
      const { requireAdmin } = await import("../../lib/middleware/auth.js");
      const adminUser = await requireAdmin(event);

      const body = await parseJsonBody(event);
      const { name, icon, order, rules, isActive, description, benefits } = body;

      if (!name || typeof name !== "string" || !name.trim()) {
        throw new HttpError(400, "Nama level wajib diisi");
      }
      if (!icon || typeof icon !== "string") {
        throw new HttpError(400, "Icon wajib diisi");
      }
      validateBase64ImageSize(icon, MAX_ICON_SIZE_BYTES);
      if (typeof order !== "number" || Number.isNaN(order)) {
        throw new HttpError(400, "Order wajib berupa angka");
      }

      const sanitizedRules = sanitizeLevelRules(rules);
      const sanitizedBenefits = sanitizeLevelBenefits(benefits ?? []);
      const active = isActive !== undefined ? Boolean(isActive) : true;

      if (active) {
        await assertLevelOrderAvailable(order);
      }

      const level = await UserLevel.create({
        name: name.trim(),
        icon,
        order,
        description: typeof description === "string" ? description.trim().slice(0, 200) : "",
        benefits: sanitizedBenefits,
        rules: sanitizedRules,
        isActive: active,
        createdBy: adminUser._id,
        updatedBy: adminUser._id,
      });

      return jsonResponse(
        201,
        { success: true, data: level, message: "Level berhasil dibuat" },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Levels handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleLevels;
