import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    name: {
      type: String,
      required: true,
      default: "Anonim",
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    review: {
      type: String,
      required: [true, "Review text is required"],
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
    contactPermission: {
      type: Boolean,
      required: true,
      default: false,
    },
    email: {
      type: String,
      required: function () {
        return this.contactPermission;
      },
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          if (!this.contactPermission) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    phone: {
      type: String,
      required: function () {
        return this.contactPermission;
      },
      trim: true,
      validate: {
        validator: function (v) {
          if (!this.contactPermission) return true;
          return /^(08|62)[0-9]{8,13}$/.test(v.replace(/\s+/g, ""));
        },
        message: "Invalid phone format",
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for performance
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

// Transform output to clean up data
ReviewSchema.methods.toJSON = function () {
  const reviewObject = this.toObject();
  return reviewObject;
};

const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);

export default Review;
