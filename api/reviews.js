import dotenv from "dotenv";

import Review from "./models/Review.js";
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

export async function handleReviews(event) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    switch (method) {
      case "POST":
        return await createReview(event, headers);
      case "GET":
        return await getReviews(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Reviews handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

async function createReview(event, headers) {
  const { rating, name, review, contactPermission, email, phone } =
    parseJsonBody(event);

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
    const reviewData = {
      rating: parseInt(rating, 10),
      name: name?.trim() || "Anonim",
      review: review.trim(),
      contactPermission: Boolean(contactPermission),
      email: contactPermission ? email?.toLowerCase().trim() : null,
      phone: contactPermission ? phone?.replace(/\s+/g, "") : null,
    };

    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    return jsonResponse(
      201,
      {
        success: true,
        message: "Review berhasil disimpan",
        data: savedReview,
      },
      headers
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

async function getReviews(event, headers) {
  const { page = 1, limit = 10, rating } = getQueryParams(event);

  const query = {};
  if (rating) {
    query.rating = parseInt(rating, 10);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  const [reviews, totalItems] = await Promise.all([
    Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Review.countDocuments(query),
  ]);

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
    headers
  );
}

export default handleReviews;
