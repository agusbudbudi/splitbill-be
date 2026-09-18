import mongoose from "mongoose";

import { connectDatabase } from "../../lib/db.js";
import UserLevelAchievement from "../../lib/models/UserLevelAchievement.js";
import User from "../../lib/models/User.js";
import { BENEFIT_TYPE_CONFIG } from "../../lib/levelRewards.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

export async function handleLevelClaim(event, levelId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(levelId)) {
      throw new HttpError(400, "ID level tidak valid");
    }

    await connectDatabase();

    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    const { requireUser } = await import("../../lib/middleware/auth.js");
    const user = await requireUser(event);

    const achievement = await UserLevelAchievement.findOne({
      user: user._id,
      level: levelId,
    });
    if (!achievement) {
      throw new HttpError(404, "Level ini belum tercapai");
    }
    if (achievement.claimed) {
      throw new HttpError(409, "Reward level ini sudah diklaim");
    }

    // Atomic flip — filter claimed:false mencegah dobel klaim saat race
    // (mis. dua klik cepat / dua request bersamaan).
    const updated = await UserLevelAchievement.findOneAndUpdate(
      { _id: achievement._id, claimed: false },
      { claimed: true, claimedAt: new Date() },
      { new: true }
    );
    if (!updated) {
      throw new HttpError(409, "Reward level ini sudah diklaim");
    }

    const increments = {};
    for (const reward of updated.rewardsSnapshot || []) {
      const config = BENEFIT_TYPE_CONFIG[reward.benefitType];
      if (!config) continue;
      increments[config.userField] = (increments[config.userField] || 0) + reward.amount;
    }

    if (Object.keys(increments).length > 0) {
      await User.findByIdAndUpdate(user._id, { $inc: increments });
    }

    return jsonResponse(
      200,
      { success: true, data: updated, message: "Reward berhasil diklaim" },
      headers
    );
  } catch (error) {
    console.error("Level claim handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleLevelClaim;
