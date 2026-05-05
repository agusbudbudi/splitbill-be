import dotenv from "dotenv";

import SubscriptionPackage from "../lib/models/SubscriptionPackage.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { getQueryParams, parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

dotenv.config();

function computeFinalPrice(price, discountType, discountValue) {
  const p = Number(price) || 0;
  const d = Number(discountValue) || 0;
  if (discountType === "percentage") {
    return Math.max(0, Math.round(p * (1 - d / 100)));
  }
  return Math.max(0, p - d);
}

export async function handleSubscriptionPackages(event, context, subresource) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (subresource === "public") {
      return await getPublicPackages(event, headers);
    }

    const { adminMiddleware } = await import("../lib/middleware/auth.js");

    switch (method) {
      case "GET":
        return await adminMiddleware(getPackages)(event, headers);
      case "POST":
        return await adminMiddleware(createPackage)(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Subscription packages handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export async function handleSubscriptionPackageById(event, id, context) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    const { adminMiddleware } = await import("../lib/middleware/auth.js");

    switch (method) {
      case "GET":
        return await adminMiddleware((e, h) => getPackageById(e, id, h))(event, headers);
      case "PUT":
        return await adminMiddleware((e, h) => updatePackage(e, id, h))(event, headers);
      case "DELETE":
        return await adminMiddleware((e, h) => deletePackage(e, id, h))(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Subscription package by ID handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function getPublicPackages(event, headers) {
  const packages = await SubscriptionPackage.find({
    showToCustomer: true,
    isActive: true,
  }).sort({ durationMonths: 1 });

  return jsonResponse(
    200,
    {
      success: true,
      data: { packages },
    },
    headers
  );
}

async function getPackages(event, headers) {
  const { page = "1", limit = "10", search = "" } = getQueryParams(event);
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = search
    ? { name: { $regex: search, $options: "i" } }
    : {};

  const [packages, total] = await Promise.all([
    SubscriptionPackage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    SubscriptionPackage.countDocuments(query),
  ]);

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        packages,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    },
    headers
  );
}

async function createPackage(event, headers) {
  const body = await parseJsonBody(event);
  const {
    name,
    description = "",
    price,
    discountType = "rupiah",
    discountValue = 0,
    durationMonths,
    benefits = [],
    isActive = true,
    showToCustomer = false,
  } = body;

  if (!name || !name.trim()) {
    throw new HttpError(400, "Validation error", [
      { field: "name", message: "Nama paket harus diisi" },
    ]);
  }

  if (price === undefined || price === null || price === "") {
    throw new HttpError(400, "Validation error", [
      { field: "price", message: "Harga harus diisi" },
    ]);
  }

  if (!durationMonths) {
    throw new HttpError(400, "Validation error", [
      { field: "durationMonths", message: "Durasi harus dipilih" },
    ]);
  }

  const finalPrice = computeFinalPrice(price, discountType, discountValue);

  const pkg = new SubscriptionPackage({
    name: name.trim(),
    description: description.trim(),
    price: Number(price),
    discountType,
    discountValue: Number(discountValue),
    finalPrice,
    durationMonths: Number(durationMonths),
    benefits: benefits.filter((b) => b && b.trim()).map((b) => b.trim()),
    isActive,
    showToCustomer,
  });

  await pkg.save();

  return jsonResponse(
    201,
    {
      success: true,
      message: "Paket berhasil ditambahkan",
      data: { package: pkg },
    },
    headers
  );
}

async function getPackageById(event, id, headers) {
  const pkg = await SubscriptionPackage.findById(id);

  if (!pkg) {
    throw new HttpError(404, "Paket tidak ditemukan");
  }

  return jsonResponse(
    200,
    { success: true, data: { package: pkg } },
    headers
  );
}

async function updatePackage(event, id, headers) {
  const body = await parseJsonBody(event);
  const {
    name,
    description,
    price,
    discountType,
    discountValue,
    durationMonths,
    benefits,
    isActive,
    showToCustomer,
  } = body;

  const pkg = await SubscriptionPackage.findById(id);

  if (!pkg) {
    throw new HttpError(404, "Paket tidak ditemukan");
  }

  if (name !== undefined) pkg.name = name.trim();
  if (description !== undefined) pkg.description = description.trim();
  if (price !== undefined) pkg.price = Number(price);
  if (discountType !== undefined) pkg.discountType = discountType;
  if (discountValue !== undefined) pkg.discountValue = Number(discountValue);
  if (durationMonths !== undefined) pkg.durationMonths = Number(durationMonths);
  if (benefits !== undefined)
    pkg.benefits = benefits.filter((b) => b && b.trim()).map((b) => b.trim());
  if (isActive !== undefined) pkg.isActive = isActive;
  if (showToCustomer !== undefined) pkg.showToCustomer = showToCustomer;

  // Recompute finalPrice from current values (pre-save hook also does this)
  pkg.finalPrice = computeFinalPrice(pkg.price, pkg.discountType, pkg.discountValue);

  await pkg.save();

  return jsonResponse(
    200,
    {
      success: true,
      message: "Paket berhasil diperbarui",
      data: { package: pkg },
    },
    headers
  );
}

async function deletePackage(event, id, headers) {
  const pkg = await SubscriptionPackage.findByIdAndDelete(id);

  if (!pkg) {
    throw new HttpError(404, "Paket tidak ditemukan");
  }

  return jsonResponse(
    200,
    { success: true, message: "Paket berhasil dihapus" },
    headers
  );
}
