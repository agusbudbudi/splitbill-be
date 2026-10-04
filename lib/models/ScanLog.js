import mongoose from "mongoose";

const ScanLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["openrouter", "groq", "gemini"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    // Per-provider outcome of this request (see api/gemini-scan.js). Absent on
    // rows logged before this field existed.
    attempts: {
      openrouter: { type: String, enum: ["success", "failed", "skipped", "cancelled", "not_attempted"] },
      groq: { type: String, enum: ["success", "failed", "skipped", "cancelled", "not_attempted"] },
      gemini: { type: String, enum: ["success", "failed", "skipped", "cancelled", "not_attempted"] },
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

ScanLogSchema.index({ createdAt: -1 });
ScanLogSchema.index({ status: 1, createdAt: -1 });
// Retry-rate lookup matches failed attempts to the next attempt by the same
// guest IP within a time window — needs ipAddress indexed, not just createdAt.
ScanLogSchema.index({ ipAddress: 1, createdAt: 1 });
ScanLogSchema.index({ user: 1, createdAt: 1 });

const ScanLog =
  mongoose.models.ScanLog || mongoose.model("ScanLog", ScanLogSchema);

export default ScanLog;
