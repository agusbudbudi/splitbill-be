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
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

const MAX_ICON_SIZE_BYTES = 1 * 1024 * 1024;

export async function handleLevelById(event, levelId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    const { requireAdmin } = await import("../../lib/middleware/auth.js");
    const adminUser = await requireAdmin(event);

    if (!levelId) {
      throw new HttpError(400, "Level ID wajib diisi");
    }

    if (method === "GET") {
      const level = await UserLevel.findById(levelId);
      if (!level) {
        throw new HttpError(404, "Level tidak ditemukan");
      }
      return jsonResponse(200, { success: true, data: level }, headers);
    }

    if (method === "PUT") {
      const body = await parseJsonBody(event);
      const { name, icon, order, rules, isActive, description, benefits } = body;

      const level = await UserLevel.findById(levelId);
      if (!level) {
        throw new HttpError(404, "Level tidak ditemukan");
      }

      const nextActive = isActive !== undefined ? Boolean(isActive) : level.isActive;
      const nextOrder = order !== undefined ? order : level.order;

      if (order !== undefined && (typeof order !== "number" || Number.isNaN(order))) {
        throw new HttpError(400, "Order wajib berupa angka");
      }

      if (nextActive) {
        await assertLevelOrderAvailable(nextOrder, level._id);
      }

      if (name !== undefined) {
        if (!name.trim()) throw new HttpError(400, "Nama level wajib diisi");
        level.name = name.trim();
      }
      if (icon !== undefined) {
        if (!icon) throw new HttpError(400, "Icon wajib diisi");
        validateBase64ImageSize(icon, MAX_ICON_SIZE_BYTES);
        level.icon = icon;
      }
      if (order !== undefined) {
        level.order = order;
      }
      if (rules !== undefined) {
        level.rules = sanitizeLevelRules(rules);
      }
      if (description !== undefined) {
        level.description = typeof description === "string" ? description.trim().slice(0, 200) : "";
      }
      if (benefits !== undefined) {
        level.benefits = sanitizeLevelBenefits(benefits);
      }
      if (isActive !== undefined) {
        level.isActive = Boolean(isActive);
      }
      level.updatedBy = adminUser._id;

      await level.save();

      return jsonResponse(
        200,
        { success: true, data: level, message: "Level berhasil diperbarui" },
        headers
      );
    }

    if (method === "DELETE") {
      const level = await UserLevel.findByIdAndDelete(levelId);
      if (!level) {
        throw new HttpError(404, "Level tidak ditemukan");
      }
      return jsonResponse(
        200,
        { success: true, message: "Level berhasil dihapus" },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Level by-id handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleLevelById;
