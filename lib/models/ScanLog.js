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
      enum: ["groq", "gemini"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    errorMessage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

ScanLogSchema.index({ createdAt: -1 });

const ScanLog =
  mongoose.models.ScanLog || mongoose.model("ScanLog", ScanLogSchema);

export default ScanLog;
