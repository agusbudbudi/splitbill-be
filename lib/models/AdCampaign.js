import mongoose from "mongoose";

const AdCampaignSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, "Campaign ID (slug) is required"],
    unique: true,
    trim: true,
  },
  sponsorName: {
    type: String,
    required: [true, "Sponsor name is required"],
    trim: true,
  },
  title: {
    type: String,
    trim: true,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  mediaType: {
    type: String,
    enum: ["image", "video"],
    required: [true, "Media type is required"],
  },
  mediaUrl: {
    type: String,
    required: [true, "Media URL is required"],
    trim: true,
  },
  ctaUrl: {
    type: String,
    trim: true,
    default: null,
  },
  ctaText: {
    type: String,
    trim: true,
    default: null,
  },
  durationSeconds: {
    type: Number,
    required: [true, "Duration is required"],
    default: 10,
    min: [1, "Duration must be at least 1 second"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
});

AdCampaignSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const AdCampaign =
  mongoose.models.AdCampaign ||
  mongoose.model("AdCampaign", AdCampaignSchema);

export default AdCampaign;
