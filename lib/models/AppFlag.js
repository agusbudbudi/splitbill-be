import mongoose from "mongoose";

// Small persistent switches that must outlive the documents they describe,
// e.g. "faqsConfigured" stays set after every FAQ is deleted.
const AppFlagSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const AppFlag = mongoose.models.AppFlag || mongoose.model("AppFlag", AppFlagSchema);

export default AppFlag;
