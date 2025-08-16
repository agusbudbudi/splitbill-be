import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import Review from "./models/Review.js";
import initMiddleware from "../lib/init-middleware.js";

dotenv.config();

// Initialize CORS middleware
const corsMiddleware = initMiddleware(
  cors({
    origin: true,
    credentials: true,
  })
);

// Connect to MongoDB
const connectDB = async () => {
  if (!mongoose.connection.readyState) {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
  }
};

export default async function handler(req, res) {
  try {
    // Apply CORS
    await corsMiddleware(req, res);

    // Check environment variables
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI environment variable is not set");
      return res.status(500).json({
        success: false,
        message: "Database configuration error",
      });
    }

    await connectDB();

    // Handle different HTTP methods
    switch (req.method) {
      case "POST":
        return await createReview(req, res);
      case "GET":
        return await getReviews(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: "Method not allowed",
        });
    }
  } catch (error) {
    console.error("Reviews API error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // More specific error handling
    if (error.name === "MongooseError" || error.name === "MongoError") {
      return res.status(500).json({
        success: false,
        message: "Database connection error",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: error.message }),
    });
  }
}

// Create a new review
async function createReview(req, res) {
  try {
    const { rating, name, review, contactPermission, email, phone } = req.body;

    // Validate required fields
    if (!rating || !review) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: [
          {
            field: "rating",
            message: "Rating harus diisi",
          },
          {
            field: "review",
            message: "Ulasan harus diisi",
          },
        ],
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: [
          {
            field: "rating",
            message: "Rating harus antara 1-5",
          },
        ],
      });
    }

    // Validate contact fields if permission is given
    if (contactPermission) {
      const errors = [];

      if (!email || !phone) {
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
      }

      // Validate email format
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({
          field: "email",
          message: "Format email tidak valid",
        });
      }

      // Validate phone format (Indonesian)
      if (phone && !/^(08|62)[0-9]{8,13}$/.test(phone.replace(/\s+/g, ""))) {
        errors.push({
          field: "phone",
          message: "Format nomor telepon tidak valid",
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors,
        });
      }
    }

    // Create review data
    const reviewData = {
      rating: parseInt(rating),
      name: name?.trim() || "Anonim",
      review: review.trim(),
      contactPermission: Boolean(contactPermission),
      email: contactPermission ? email?.toLowerCase().trim() : null,
      phone: contactPermission ? phone?.replace(/\s+/g, "") : null,
    };

    console.log("Creating review with data:", reviewData);

    // Create new review
    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    console.log("Review created successfully:", savedReview._id);

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Review berhasil disimpan",
      data: savedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    throw error; // Re-throw to be handled by main error handler
  }
}

// Get reviews (optional - for admin)
async function getReviews(req, res) {
  try {
    const { page = 1, limit = 10, rating } = req.query;

    // Build query
    const query = {};
    if (rating) {
      query.rating = parseInt(rating);
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get reviews with pagination
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalItems = await Review.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limitNum);

    console.log(`Retrieved ${reviews.length} reviews (page ${pageNum})`);

    return res.status(200).json({
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
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    throw error; // Re-throw to be handled by main error handler
  }
}
