import mongoose from "mongoose";

const EntryPointCardSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, "Slug is required"],
    unique: true,
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, "Image URL is required"],
    trim: true,
  },
  imageAlt: {
    type: String,
    required: [true, "Image alt text is required"],
    trim: true,
  },
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  subtitle: {
    type: String,
    trim: true,
    default: null,
  },
  ctaText: {
    type: String,
    trim: true,
    default: null,
  },
  url: {
    type: String,
    trim: true,
    default: null,
  },
  footerText: {
    type: String,
    trim: true,
    default: null,
  },
  footerIconUrl: {
    type: String,
    trim: true,
    default: null,
  },
  ribbonText: {
    type: String,
    trim: true,
    default: null,
  },
  placement: {
    type: String,
    default: "homepage-member",
    trim: true,
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

EntryPointCardSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const EntryPointCard =
  mongoose.models.EntryPointCard ||
  mongoose.model("EntryPointCard", EntryPointCardSchema);

export default EntryPointCard;
