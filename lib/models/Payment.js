import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "expired"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add TTL index for automatic expiration if needed, 
// though we'll also check it manually in the API.
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
