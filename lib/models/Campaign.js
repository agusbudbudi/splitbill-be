import mongoose from "mongoose";
import { DynamicSegmentSchema } from "./Segment.js";

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [function() { return this.status !== 'draft'; }, "Campaign name is required"],
    trim: true,
  },
  segment: {
    type: String,
    required: [function() { return this.status !== 'draft'; }, "Segment is required"],
    enum: [
      "all",
      "unverified",
      "free",
      "free_scan_exhausted",
      "inactive_30d",
      "premium",
      "no_split_bill",
      "dynamic",
    ],
  },
  dynamicSegment: {
    type: DynamicSegmentSchema,
    required: [
      function () {
        return this.status !== "draft" && this.segment === "dynamic";
      },
      "Dynamic segment configuration is required when segment is dynamic",
    ],
  },
  subject: {
    type: String,
    required: [function() { return this.status !== 'draft'; }, "Subject is required"],
  },
  content: {
    type: String,
    required: [function() { return this.status !== 'draft'; }, "Content is required"],
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
    enum: ["draft", "pending", "sent", "failed"],
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
