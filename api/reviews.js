import dotenv from "dotenv";

import Review from "../lib/models/Review.js";
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

export async function handleReviews(event, context, subresource) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    const isPublic = subresource === "public" || event.path?.includes("/public") || event.rawUrl?.includes("/public");

    switch (method) {
      case "POST":
        return await createReview(event, headers);
      case "GET":
        if (isPublic) {
          return await getReviews(event, headers, true);
        }
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware(getReviews)(event, headers);
      case "PATCH":
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware(updateReview)(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Reviews handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function updateReview(event, headers) {
  const { id, showOnLanding } = await parseJsonBody(event);

  if (!id) {
    throw new HttpError(400, "Review ID is required");
  }

  const updatedReview = await Review.findByIdAndUpdate(
    id,
    { showOnLanding: Boolean(showOnLanding) },
    { new: true, runValidators: true },
  );

  if (!updatedReview) {
    throw new HttpError(404, "Review not found");
  }

  return jsonResponse(
    200,
    {
      success: true,
      message: "Status landing page review berhasil diperbarui",
      data: updatedReview,
    },
    headers,
  );
}

async function createReview(event, headers) {
  const { rating, name, review, contactPermission, email, phone } =
    await parseJsonBody(event);

  if (!rating || !review) {
    throw new HttpError(400, "Validation error", [
      { field: "rating", message: "Rating harus diisi" },
      { field: "review", message: "Ulasan harus diisi" },
    ]);
  }

  if (rating < 1 || rating > 5) {
    throw new HttpError(400, "Validation error", [
      { field: "rating", message: "Rating harus antara 1-5" },
    ]);
  }

  if (contactPermission) {
    const errors = [];

    if (!email) {
      errors.push({
        field: "email",
        message: "Email harus diisi jika bersedia dihubungi",
      });
    }

    if (!phone) {
      errors.push({
        field: "phone",
        message: "Nomor telepon harus diisi jika bersedia dihubungi",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: "email", message: "Format email tidak valid" });
    }

    if (phone && !/^(08|62)[0-9]{8,13}$/.test(phone.replace(/\s+/g, ""))) {
      errors.push({
        field: "phone",
        message: "Format nomor telepon tidak valid",
      });
    }

    if (errors.length > 0) {
      throw new HttpError(400, "Validation error", errors);
    }
  }

  try {
    const { requireUser } = await import("../lib/middleware/auth.js");
    let user = null;
    let rewardEarned = false;

    try {
      user = await requireUser(event);
    } catch (e) {
      // User not logged in, continue as anonymous
    }

    const reviewData = {
      rating: parseInt(rating, 10),
      name: name?.trim() || "Anonim",
      review: review.trim(),
      contactPermission: Boolean(contactPermission),
      email: contactPermission ? email?.toLowerCase().trim() : null,
      phone: contactPermission ? phone?.replace(/\s+/g, "") : null,
      userId: user ? user._id : null,
    };

    if (user && !user.hasClaimedReviewReward) {
      user.freeScanCount = (user.freeScanCount || 0) + 5;
      user.hasClaimedReviewReward = true;
      await user.save();
      rewardEarned = true;
    }

    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    return jsonResponse(
      201,
      {
        success: true,
        message: rewardEarned
          ? "Review berhasil disimpan! Kamu mendapatkan +5 kuota scan AI 🎁"
          : "Review berhasil disimpan",
        data: savedReview,
        rewardEarned,
      },
      headers,
    );
  } catch (error) {
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

async function getReviews(event, headers, isPublicRequest = false) {
  const { page = 1, limit = 10, rating } = getQueryParams(event);

  const query = {};
  if (rating) {
    query.rating = parseInt(rating, 10);
  }

  if (isPublicRequest) {
    query.showOnLanding = true;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  let [reviews, totalItems] = await Promise.all([
    Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Review.countDocuments(query),
  ]);

  if (isPublicRequest) {
    reviews = reviews.map((r) => {
      const reviewObj = r.toObject();
      delete reviewObj.contactPermission;
      delete reviewObj.email;
      delete reviewObj.phone;
      return reviewObj;
    });
  }

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
        },
      },
    },
    headers,
  );
}

export default handleReviews;
