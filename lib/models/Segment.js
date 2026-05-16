import mongoose from "mongoose";

// Schema for a single rule/condition (e.g., freeScanCount < 3)
const RuleSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
    },
    operator: {
      type: String,
      required: true,
      enum: ["eq", "ne", "gt", "gte", "lt", "lte", "contains"],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false }
);

// Schema for a group of conditions to support AND/OR logic
const ConditionGroupSchema = new mongoose.Schema(
  {
    operator: {
      type: String,
      enum: ["AND", "OR"],
      default: "AND",
    },
    rules: [RuleSchema],
  },
  { _id: false }
);

// Reusable schema that can be embedded into Campaign, Banner, etc.
export const DynamicSegmentSchema = new mongoose.Schema(
  {
    included: [ConditionGroupSchema],
    excluded: [ConditionGroupSchema],
  },
  { _id: false }
);
