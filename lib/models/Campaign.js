import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Campaign name is required"],
    trim: true,
  },
  segment: {
    type: String,
    required: [true, "Segment is required"],
    enum: [
      "all",
      "unverified",
      "free",
      "free_scan_exhausted",
      "inactive_30d",
      "premium",
      "no_split_bill",
    ],
  },
  subject: {
    type: String,
    required: [true, "Subject is required"],
  },
  content: {
    type: String,
    required: [true, "Content is required"],
  },
  ctaText: {
    type: String,
  },
  ctaUrl: {
    type: String,
  },
  recipientCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending",
  },
  sentAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Campaign =
  mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);

export default Campaign;
