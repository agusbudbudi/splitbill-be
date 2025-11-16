import mongoose from "mongoose";

const RecordParticipantSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidBy: {
      type: String,
      required: true,
      trim: true,
    },
    participants: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const AdditionalExpenseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidBy: {
      type: String,
      required: true,
      trim: true,
    },
    participants: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const OwedItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["base", "additional"],
      required: true,
    },
  },
  { _id: false }
);

const ParticipantSummarySchema = new mongoose.Schema(
  {
    participantId: {
      type: String,
      required: true,
      trim: true,
    },
    paid: {
      type: Number,
      required: true,
      min: 0,
    },
    owed: {
      type: Number,
      required: true,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
    },
    owedItems: {
      type: [OwedItemSchema],
      default: [],
    },
  },
  { _id: false }
);

const SettlementSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const SummarySchema = new mongoose.Schema(
  {
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    perParticipant: {
      type: [ParticipantSummarySchema],
      default: [],
    },
    settlements: {
      type: [SettlementSchema],
      default: [],
    },
  },
  { _id: false }
);

const SplitBillRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activityName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    participants: {
      type: [RecordParticipantSchema],
      default: [],
    },
    expenses: {
      type: [ExpenseSchema],
      default: [],
    },
    additionalExpenses: {
      type: [AdditionalExpenseSchema],
      default: [],
    },
    paymentMethodIds: {
      type: [String],
      default: [],
    },
    summary: {
      type: SummarySchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["locked", "editable"],
      default: "locked",
    },
  },
  {
    timestamps: true,
  }
);

SplitBillRecordSchema.index({ user: 1, createdAt: -1 });

const SplitBillRecord =
  mongoose.models.SplitBillRecord ||
  mongoose.model("SplitBillRecord", SplitBillRecordSchema);

export default SplitBillRecord;
