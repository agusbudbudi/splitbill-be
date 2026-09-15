import mongoose from "mongoose";

export const LEVEL_METRIC_VALUES = ["splitCount", "totalAmount", "friendCount"];
export const LEVEL_OPERATOR_VALUES = ["=", ">", "<", ">=", "<="];

const LevelRuleSchema = new mongoose.Schema(
  {
    metric: { type: String, enum: LEVEL_METRIC_VALUES, required: true },
    operator: { type: String, enum: LEVEL_OPERATOR_VALUES, required: true },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const UserLevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Nama level wajib diisi"],
    trim: true,
    maxlength: 60,
  },
  // base64 data URL, dikompres & di-upload client-side (pola sama dengan Banner.image)
  icon: {
    type: String,
    required: [true, "Icon wajib diisi"],
    trim: true,
  },
  // makin besar = makin tinggi level; unik di antara level isActive=true (divalidasi di handler)
  order: {
    type: Number,
    required: true,
  },
  // tagline singkat, ditampilkan di halaman detail level member
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: "",
  },
  // bullet list benefit, ditampilkan di halaman detail level member
  benefits: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // OR logic — level match kalau salah satu rule terpenuhi
  rules: {
    type: [LevelRuleSchema],
    validate: {
      validator: (rules) => Array.isArray(rules) && rules.length > 0,
      message: "Minimal 1 rule diperlukan",
    },
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

UserLevelSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const UserLevel =
  mongoose.models.UserLevel || mongoose.model("UserLevel", UserLevelSchema);

export default UserLevel;
