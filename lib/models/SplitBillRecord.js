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
      // min: 0, // Allow negative for promo
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
      // min: 0, // Allow negative for promo
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
    splitType: {
      type: String,
      enum: ["equally", "proportionally"],
      default: "equally",
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
      // min: 0, // Allow negative for promo
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
      // min: 0,
    },
    owed: {
      type: Number,
      required: true,
      // min: 0,
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
      // min: 0,
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

const PaymentMethodSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["bank_transfer", "ewallet"],
      required: true,
    },
    provider: { type: String, required: true, trim: true, maxlength: 120 },
    ownerName: { type: String, required: true, trim: true, maxlength: 120 },
    accountNumber: { type: String, required: false, trim: true, maxlength: 50 },
    phoneNumber: { type: String, required: false, trim: true, maxlength: 50 },
  },
  { _id: false }
);

const ReceiptImageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    // Internal blob storage key — never exposed to clients (see api/split-bills/images.js)
    blobKey: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
      required: false,
    },
    height: {
      type: Number,
      required: false,
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const SplitBillRecordSchema = new mongoose.Schema(
  {
    // user is nullable for guest drafts; populated on login/register or finalization
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },
    // status: 'editable' = DRAFT (in-progress), 'locked' = FINALIZED
    status: {
      type: String,
      enum: ["locked", "editable"],
      default: "locked",
    },
    // last_step tracks funnel progression
    last_step: {
      type: String,
      enum: ["STEP_1", "STEP_2", "STEP_3", "FINALIZED"],
      default: null,
    },
    // Bill data fields — optional for partial draft saves
    activityName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 160,
    },
    occurredAt: {
      type: Date,
      required: false,
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
    paymentMethodSnapshots: {
      type: [PaymentMethodSnapshotSchema],
      default: [],
    },
    summary: {
      type: SummarySchema,
      required: false,
      default: null,
    },
    // Uploaded receipt photos (optimized, stored in Netlify Blobs — see lib/blobStore.js).
    // Entries may outlive the blob itself (manual purge from the blob store), so any code
    // reading these must tolerate a missing blob — see api/split-bills/images.js.
    receiptImages: {
      type: [ReceiptImageSchema],
      default: [],
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
