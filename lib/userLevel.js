import UserLevel, {
  LEVEL_METRIC_VALUES,
  LEVEL_OPERATOR_VALUES,
} from "./models/UserLevel.js";
import UserLevelAchievement from "./models/UserLevelAchievement.js";
import SplitBillRecord from "./models/SplitBillRecord.js";
import User from "./models/User.js";
import { BENEFIT_TYPE_VALUES } from "./levelRewards.js";
import { HttpError } from "./errors.js";

function normalizeName(name) {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}

export async function computeUserStats(userId) {
  const [records, user] = await Promise.all([
    SplitBillRecord.find(
      { user: userId, status: "locked" },
      { "summary.total": 1, participants: 1 }
    ).lean(),
    User.findById(userId, { name: 1 }).lean(),
  ]);

  const splitCount = records.length;
  const totalAmount = records.reduce(
    (sum, record) => sum + (record.summary?.total || 0),
    0
  );

  const ownName = normalizeName(user?.name);
  const friendNames = new Set();
  for (const record of records) {
    for (const participant of record.participants || []) {
      const normalized = normalizeName(participant?.name);
      if (normalized && normalized !== ownName) {
        friendNames.add(normalized);
      }
    }
  }

  return { splitCount, totalAmount, friendCount: friendNames.size };
}

function evaluateRule(rule, stats) {
  const actual = stats[rule.metric];
  if (typeof actual !== "number") return false;
  switch (rule.operator) {
    case "=":
      return actual === rule.value;
    case ">":
      return actual > rule.value;
    case "<":
      return actual < rule.value;
    case ">=":
      return actual >= rule.value;
    case "<=":
      return actual <= rule.value;
    default:
      return false;
  }
}

// Dievaluasi dari order tertinggi ke terendah — match pertama menang.
// Fallback ke level order terendah kalau tidak ada yang match (lihat PRD §5).
export function resolveLevel(stats, levels) {
  const sorted = [...levels].sort((a, b) => b.order - a.order);
  for (const level of sorted) {
    if ((level.rules || []).some((rule) => evaluateRule(rule, stats))) {
      return level;
    }
  }
  return sorted[sorted.length - 1] || null;
}

export function getNextLevel(currentLevel, levels) {
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  if (!currentLevel) return sorted[0] || null;
  const idx = sorted.findIndex(
    (level) => String(level._id) === String(currentLevel._id)
  );
  if (idx === -1 || idx === sorted.length - 1) return null;
  return sorted[idx + 1];
}

export function sanitizeLevelRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new HttpError(400, "Minimal 1 rule diperlukan");
  }
  return rules.map((rule) => {
    if (!rule || typeof rule !== "object") {
      throw new HttpError(400, "Rule tidak valid");
    }
    const { metric, operator, value } = rule;
    if (!LEVEL_METRIC_VALUES.includes(metric)) {
      throw new HttpError(400, `Metric tidak valid: ${metric}`);
    }
    if (!LEVEL_OPERATOR_VALUES.includes(operator)) {
      throw new HttpError(400, `Operator tidak valid: ${operator}`);
    }
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      throw new HttpError(400, "Value rule harus angka dan >= 0");
    }
    return { metric, operator, value };
  });
}

const MAX_REWARDS = 10;

export function sanitizeLevelRewards(rewards) {
  if (rewards === undefined || rewards === null) return [];
  if (!Array.isArray(rewards)) {
    throw new HttpError(400, "Rewards harus berupa array");
  }
  return rewards.slice(0, MAX_REWARDS).map((reward) => {
    if (!reward || typeof reward !== "object") {
      throw new HttpError(400, "Reward tidak valid");
    }
    const { benefitType, amount } = reward;
    if (!BENEFIT_TYPE_VALUES.includes(benefitType)) {
      throw new HttpError(400, `Benefit type tidak valid: ${benefitType}`);
    }
    if (typeof amount !== "number" || Number.isNaN(amount) || amount < 1) {
      throw new HttpError(400, "Amount reward harus angka dan >= 1");
    }
    return { benefitType, amount };
  });
}

// Dipanggil setelah event yang menaikkan stats (finalize split bill). Untuk
// tiap level aktif yang rule-nya match, insert achievement kalau belum ada.
// Upsert + unique index (user, level) di UserLevelAchievement bikin ini
// idempotent & race-safe — level yang sama tidak akan pernah ke-grant/klaim
// dua kali walau user naik-turun-naik level itu berkali-kali.
export async function checkAndGrantAchievements(userId) {
  const [stats, levels] = await Promise.all([
    computeUserStats(userId),
    UserLevel.find({ isActive: true }),
  ]);

  const matchingLevels = levels.filter((level) =>
    (level.rules || []).some((rule) => evaluateRule(rule, stats))
  );

  await Promise.all(
    matchingLevels.map((level) =>
      UserLevelAchievement.updateOne(
        { user: userId, level: level._id },
        {
          $setOnInsert: {
            achievedAt: new Date(),
            claimed: false,
            rewardsSnapshot: level.rewards || [],
          },
        },
        { upsert: true }
      )
    )
  );
}

const MAX_BENEFITS = 10;
const MAX_BENEFIT_LENGTH = 120;

export function sanitizeLevelBenefits(benefits) {
  if (!Array.isArray(benefits)) {
    throw new HttpError(400, "Benefits harus berupa array");
  }
  return benefits
    .map((benefit) => (typeof benefit === "string" ? benefit.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_BENEFITS)
    .map((benefit) => benefit.slice(0, MAX_BENEFIT_LENGTH));
}

// order harus unik di antara level isActive=true (levelId aktif itu sendiri dikecualikan saat update)
export async function assertLevelOrderAvailable(order, excludeId = null) {
  const filter = { order, isActive: true };
  if (excludeId) filter._id = { $ne: excludeId };
  const conflict = await UserLevel.findOne(filter);
  if (conflict) {
    throw new HttpError(
      400,
      `Level aktif dengan order ${order} sudah ada ("${conflict.name}")`
    );
  }
}
