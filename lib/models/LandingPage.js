import mongoose from "mongoose";

// One document per landing page (only "homepage" for now). `content` is a
// Mixed blob whose shape is enforced by normalizeLandingContent() in
// lib/landingPage.js before every write — keeping the field-level rules in one
// place instead of duplicating them as nested Mongoose schemas.
const LandingPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
});

const LandingPage =
  mongoose.models.LandingPage || mongoose.model("LandingPage", LandingPageSchema);

export default LandingPage;
