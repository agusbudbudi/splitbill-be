import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: [true, "Image URL is required"],
    trim: true,
  },
  route: {
    type: String,
    required: [true, "Route is required"],
    trim: true,
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

// Update the updatedAt field before saving
BannerSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Banner = mongoose.models.Banner || mongoose.model("Banner", BannerSchema);

export default Banner;
