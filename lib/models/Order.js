import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["subscription"], // can be extended later
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "expired", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    qrisData: {
      type: mongoose.Schema.Types.Mixed,
    },
    isSandbox: {
      type: Boolean,
      default: false,
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

// Add TTL index for automatic expiration
OrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Add compound index for faster fetching of user orders sorted by createdAt
OrderSchema.index({ userId: 1, createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;
