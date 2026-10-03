import mongoose from "mongoose";

const LevelRewardSnapshotSchema = new mongoose.Schema(
  {
    benefitType: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const UserLevelAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserLevel",
    required: true,
  },
  achievedAt: {
    type: Date,
    default: Date.now,
  },
  claimed: {
    type: Boolean,
    default: false,
  },
  claimedAt: {
    type: Date,
    default: null,
  },
  // Copy dari UserLevel.rewards saat achieve — reward yang udah di-grant tidak
  // berubah walau admin edit reward level ini setelahnya.
  rewardsSnapshot: {
    type: [LevelRewardSnapshotSchema],
    default: [],
  },
});

// Satu user cuma bisa achieve satu level sekali — mencegah dobel klaim walau
// user naik-turun-naik level yang sama berkali-kali (lihat lib/userLevel.js).
UserLevelAchievementSchema.index({ user: 1, level: 1 }, { unique: true });

const UserLevelAchievement =
  mongoose.models.UserLevelAchievement ||
  mongoose.model("UserLevelAchievement", UserLevelAchievementSchema);

export default UserLevelAchievement;
