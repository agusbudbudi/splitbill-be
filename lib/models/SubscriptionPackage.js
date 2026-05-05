import mongoose from "mongoose";

const SubscriptionPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Package name is required"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price must be non-negative"],
  },
  discountType: {
    type: String,
    enum: ["percentage", "rupiah"],
    default: "rupiah",
  },
  discountValue: {
    type: Number,
    default: 0,
    min: [0, "Discount must be non-negative"],
  },
  finalPrice: {
    type: Number,
    min: [0, "Final price must be non-negative"],
  },
  durationMonths: {
    type: Number,
    required: [true, "Duration is required"],
    min: [1, "Duration minimum 1 month"],
    max: [12, "Duration maximum 12 months"],
  },
  benefits: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  showToCustomer: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

SubscriptionPackageSchema.pre("save", function (next) {
  if (this.discountType === "percentage") {
    this.finalPrice = Math.max(
      0,
      Math.round(this.price * (1 - this.discountValue / 100))
    );
  } else {
    this.finalPrice = Math.max(0, this.price - this.discountValue);
  }
  this.updatedAt = Date.now();
  next();
});

const SubscriptionPackage =
  mongoose.models.SubscriptionPackage ||
  mongoose.model("SubscriptionPackage", SubscriptionPackageSchema);

export default SubscriptionPackage;
