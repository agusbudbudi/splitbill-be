import dotenv from "dotenv";

import Banner from "../lib/models/Banner.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { getQueryParams, parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { authMiddleware } from "../lib/middleware/auth.js";

dotenv.config();

export async function handleBanners(event) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    switch (method) {
      case "POST":
        return await authMiddleware(upsertBanners)(event, headers);
      case "GET":
        return await getBanners(event, headers);
      case "DELETE":
        return await authMiddleware(deleteBanner)(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Banners handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function upsertBanners(event, headers) {
  const { banners } = await parseJsonBody(event);

  if (!Array.isArray(banners)) {
    throw new HttpError(400, "Invalid payload: 'banners' must be an array");
  }

  const processedBannerIds = [];
  const session = await Banner.startSession();
  session.startTransaction();

  try {
    for (const bannerData of banners) {
      const { _id, image, route } = bannerData;

      if (!image || !route) {
        throw new HttpError(400, "Validation error: Image and route are required for all banners", [
          { field: "image", message: "Image URL harus diisi" },
          { field: "route", message: "Route harus diisi" },
        ]);
      }

      let banner;
      if (_id) {
        // Update existing banner
        banner = await Banner.findByIdAndUpdate(
          _id,
          { image: image, route: route.trim(), updatedAt: Date.now() },
          { new: true, runValidators: true, session }
        );
        if (!banner) {
          throw new HttpError(404, `Banner with ID ${_id} not found`);
        }
      } else {
        // Create new banner
        banner = new Banner({ image: image, route: route.trim() });
        await banner.save({ session });
      }
      processedBannerIds.push(banner._id);
    }

    // Delete banners not in the current submission
    await Banner.deleteMany(
      { _id: { $nin: processedBannerIds } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const updatedBanners = await Banner.find().sort({ createdAt: -1 });

    return jsonResponse(
      200,
      {
        success: true,
        message: "Semua banner berhasil disimpan",
        data: {
          banners: updatedBanners,
        },
      },
      headers
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error?.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));
      throw new HttpError(400, "Validation error", errors);
    }
    throw error;
  }
}

async function getBanners(event, headers) {
  const banners = await Banner.find().sort({ createdAt: -1 });

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        banners,
      },
    },
    headers
  );
}

async function deleteBanner(event, headers) {
  const { id } = getQueryParams(event);

  if (!id) {
    throw new HttpError(400, "Banner ID is required");
  }

  const deletedBanner = await Banner.findByIdAndDelete(id);

  if (!deletedBanner) {
    throw new HttpError(404, "Banner not found");
  }

  return jsonResponse(
    200,
    {
      success: true,
      message: "Banner berhasil dihapus",
    },
    headers
  );
}

export default handleBanners;
