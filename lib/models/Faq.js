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
  question: {
    type: String,
    required: [true, "Pertanyaan wajib diisi"],
    trim: true,
    maxlength: 200,
  },
  answer: {
    type: String,
    required: [true, "Jawaban wajib diisi"],
    trim: true,
    maxlength: 2000,
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
