import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
  },
  slug: {
    type: String,
    required: [true, "Slug is required"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [160, "Excerpt must be 160 characters or fewer"],
  },
  // Stores HTML string output from TipTap editor
  content: {
    type: String,
    default: "",
  },
  thumbnail: {
    type: String,
    trim: true,
  },
  thumbnailAlt: {
    type: String,
    trim: true,
  },
  author: {
    type: String,
    trim: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  category: {
    type: String,
    trim: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  // SEO overrides — if empty, fallback to title/excerpt on frontend
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, "Meta title must be 60 characters or fewer"],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, "Meta description must be 160 characters or fewer"],
  },
  canonicalUrl: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft",
  },
  publishedAt: {
    type: Date,
  },
  // Estimated reading time in minutes (auto-calculated from content length)
  readTime: {
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

// Auto-update updatedAt on every save
BlogSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-set publishedAt when status first changes to published
BlogSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const Blog = mongoose.models.Blog || mongoose.model("Blog", BlogSchema);

export default Blog;
