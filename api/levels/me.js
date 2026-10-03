import { connectDatabase } from "../../lib/db.js";
import UserLevel from "../../lib/models/UserLevel.js";
import UserLevelAchievement from "../../lib/models/UserLevelAchievement.js";
import { computeUserStats, resolveLevel, getNextLevel } from "../../lib/userLevel.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

export async function handleUserLevelMe(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    const { requireUser } = await import("../../lib/middleware/auth.js");
    const user = await requireUser(event);

    const [stats, levels, achievements] = await Promise.all([
      computeUserStats(user._id),
      UserLevel.find({ isActive: true }),
      UserLevelAchievement.find({ user: user._id }).populate(
        "level",
        "name icon order"
      ),
    ]);

    const currentLevel = resolveLevel(stats, levels);
    const nextLevel = getNextLevel(currentLevel, levels);

    return jsonResponse(
      200,
      { success: true, data: { stats, currentLevel, nextLevel, achievements } },
      headers
    );
  } catch (error) {
    console.error("User level me handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleUserLevelMe;
