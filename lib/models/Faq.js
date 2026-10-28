import mongoose from "mongoose";
import { FAQ_CATEGORIES } from "../faqDefaults.js";

const FaqSchema = new mongoose.Schema({
  // Stable public id. Imported FAQs keep splitbill-web's original ids, which
  // pages reference directly (featureSeoContent.ts); new ones get a random key.
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  // Length limits live in normalizeFaqInput (api/faqs.js), counted in visible
  // characters. A schema maxlength would count UTF-16 units instead and reject
  // emoji-heavy text the API already accepted.
  question: {
    type: String,
    required: [true, "Pertanyaan wajib diisi"],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, "Jawaban wajib diisi"],
    trim: true,
  },
  category: {
    type: String,
    enum: FAQ_CATEGORIES,
    required: true,
  },
  showOnLanding: {
    type: Boolean,
    default: false,
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

FaqSchema.index({ isActive: 1, order: 1 });

const Faq = mongoose.models.Faq || mongoose.model("Faq", FaqSchema);

export default Faq;
