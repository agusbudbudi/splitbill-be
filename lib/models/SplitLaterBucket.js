import mongoose from "mongoose";

export const BUCKET_TYPES = ["trip", "hangout", "event", "office", "household", "other"];

const BucketReceiptSchema = new mongoose.Schema(
  {
    // Vercel Blob (or local dev fallback) URL — see splitbill-web's
    // src/app/api/split-later/upload/route.ts
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    merchant: {
      type: String,
      required: false,
      trim: true,
      maxlength: 160,
    },
    totalAmount: {
      type: Number,
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    // Set once the receipt is processed through the full /split-bill wizard
    splitBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SplitBillRecord",
      required: false,
    },
    notes: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const SplitLaterBucketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8,
    },
    bucketType: {
      type: String,
      enum: BUCKET_TYPES,
      required: true,
    },
    // Plain name roster — this feature doesn't do per-participant amount
    // math at the bucket level (unlike SplitBillRecord), so there's no id.
    participants: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["active", "done"],
      default: "active",
    },
    receipts: {
      type: [BucketReceiptSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

SplitLaterBucketSchema.index({ user: 1, updatedAt: -1 });

const SplitLaterBucket =
  mongoose.models.SplitLaterBucket ||
  mongoose.model("SplitLaterBucket", SplitLaterBucketSchema);

export default SplitLaterBucket;
