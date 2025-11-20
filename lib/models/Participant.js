import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ParticipantSchema.index(
  { user: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

ParticipantSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Participant =
  mongoose.models.Participant || mongoose.model("Participant", ParticipantSchema);

export default Participant;
