import dotenv from "dotenv";

import Review from "../lib/models/Review.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { getQueryParams, parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

dotenv.config();

export async function handleReviews(event, context, subresource) {
  const headers = createCorsHeaders(event);

  const method = event?.httpMethod || event?.method || "GET";
  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();

    const isPublic = subresource === "public" || event.path?.includes("/public") || event.rawUrl?.includes("/public");
    const isStats = subresource === "stats" || event.path?.includes("/stats") || event.rawUrl?.includes("/stats");
    const isInsights = subresource === "insights" || event.path?.includes("/insights") || event.rawUrl?.includes("/insights");

    switch (method) {
      case "POST":
        return await createReview(event, headers);
      case "GET":
        if (isStats) {
          return await (
            await import("../lib/middleware/auth.js")
          ).adminMiddleware(getReviewStats)(event, headers);
        }
        if (isInsights) {
          return await (
            await import("../lib/middleware/auth.js")
          ).adminMiddleware(getReviewInsights)(event, headers);
        }
        if (isPublic) {
          return await getReviews(event, headers, true);
        }
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware(getReviews)(event, headers);
      case "PATCH":
        return await (
          await import("../lib/middleware/auth.js")
        ).adminMiddleware(updateReview)(event, headers);
      default:
        throw new HttpError(405, `Method ${method} not allowed`);
    }
  } catch (error) {
    console.error("Reviews handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

const REVIEW_STATUSES = ["new", "reviewed", "resolved"];

async function updateReview(event, headers) {
  const { id, showOnLanding, status, adminNote } = await parseJsonBody(event);

  if (!id) {
    throw new HttpError(400, "Review ID is required");
  }

  const update = {};
  let message = "Review berhasil diperbarui";

  if (showOnLanding !== undefined) {
    update.showOnLanding = Boolean(showOnLanding);
    message = "Status landing page review berhasil diperbarui";
  }

  if (status !== undefined) {
    if (!REVIEW_STATUSES.includes(status)) {
      throw new HttpError(400, "Status tidak valid", [
        { field: "status", message: `Status harus salah satu dari: ${REVIEW_STATUSES.join(", ")}` },
      ]);
    }
    update.status = status;
    update.resolvedAt = status === "resolved" ? new Date() : null;
    message = "Status tindak lanjut review berhasil diperbarui";
  }

  if (adminNote !== undefined) {
    update.adminNote = adminNote?.trim() || "";
  }

  if (Object.keys(update).length === 0) {
    throw new HttpError(400, "Tidak ada perubahan yang dikirim");
  }

  const updatedReview = await Review.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!updatedReview) {
    throw new HttpError(404, "Review not found");
  }

  return jsonResponse(
    200,
    {
      success: true,
      message,
      data: updatedReview,
    },
    headers,
  );
}

async function createReview(event, headers) {
  const { rating, name, review, contactPermission, email, phone } =
    await parseJsonBody(event);

  if (!rating || !review) {
    throw new HttpError(400, "Validation error", [
      { field: "rating", message: "Rating harus diisi" },
      { field: "review", message: "Ulasan harus diisi" },
    ]);
  }

  if (rating < 1 || rating > 5) {
    throw new HttpError(400, "Validation error", [
      { field: "rating", message: "Rating harus antara 1-5" },
    ]);
  }

  if (contactPermission) {
    const errors = [];

    if (!email) {
      errors.push({
        field: "email",
        message: "Email harus diisi jika bersedia dihubungi",
      });
    }

    if (!phone) {
      errors.push({
        field: "phone",
        message: "Nomor telepon harus diisi jika bersedia dihubungi",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: "email", message: "Format email tidak valid" });
    }

    if (phone && !/^(08|62)[0-9]{8,13}$/.test(phone.replace(/\s+/g, ""))) {
      errors.push({
        field: "phone",
        message: "Format nomor telepon tidak valid",
      });
    }

    if (errors.length > 0) {
      throw new HttpError(400, "Validation error", errors);
    }
  }

  try {
    const { requireUser } = await import("../lib/middleware/auth.js");
    let user = null;
    let rewardEarned = false;

    try {
      user = await requireUser(event);
    } catch (e) {
      // User not logged in, continue as anonymous
    }

    const reviewData = {
      rating: parseInt(rating, 10),
      name: name?.trim() || "Anonim",
      review: review.trim(),
      contactPermission: Boolean(contactPermission),
      email: contactPermission ? email?.toLowerCase().trim() : null,
      phone: contactPermission ? phone?.replace(/\s+/g, "") : null,
      userId: user ? user._id : null,
    };

    if (user && !user.hasClaimedReviewReward) {
      user.freeScanCount = (user.freeScanCount || 0) + 5;
      user.hasClaimedReviewReward = true;
      await user.save();
      rewardEarned = true;
    }

    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    return jsonResponse(
      201,
      {
        success: true,
        message: rewardEarned
          ? "Review berhasil disimpan! Kamu mendapatkan +5 kuota scan AI 🎁"
          : "Review berhasil disimpan",
        data: savedReview,
        rewardEarned,
      },
      headers,
    );
  } catch (error) {
    if (error?.name === "ValidationError") {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
      }));

      throw new HttpError(400, "Validation error", errors);
    }

    throw error;
  }
}

async function getReviewStats(event, headers) {
  // BUG #1 FIX: Hitung aggregate stats langsung dari DB, bukan fetch semua data
  const [statsResult, contactableCount] = await Promise.all([
    Review.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalCount: { $sum: 1 },
        },
      },
    ]),
    Review.countDocuments({ contactPermission: true }),
  ]);

  const stats = statsResult[0] || { avgRating: 0, totalCount: 0 };

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        avgRating: parseFloat((stats.avgRating || 0).toFixed(2)),
        totalCount: stats.totalCount || 0,
        contactableCount,
      },
    },
    headers,
  );
}

async function getReviews(event, headers, isPublicRequest = false) {
  const { page = 1, limit = 10, rating, ratingMax, search, showOnLanding, status, contactPermission } = getQueryParams(event);

  const query = {};
  if (rating) {
    query.rating = parseInt(rating, 10);
  } else if (ratingMax) {
    query.rating = { $lte: parseInt(ratingMax, 10) };
  }

  // Filter by showOnLanding: "true" = only landing reviews, "false" = only non-landing
  if (!isPublicRequest && showOnLanding !== undefined && showOnLanding !== "") {
    query.showOnLanding = showOnLanding === "true";
  }

  // Follow-up status filter (admin only) — "new" | "reviewed" | "resolved".
  // Reviews created before the status field existed have no stored value —
  // treat missing/null as "new" so legacy reviews still show up in that bucket.
  if (!isPublicRequest && status) {
    query.status = status === "new" ? { $in: [null, "new"] } : status;
  }

  // Contact permission filter (admin only) — used by the follow-up action queue
  if (!isPublicRequest && contactPermission !== undefined && contactPermission !== "") {
    query.contactPermission = contactPermission === "true";
  }

  // BUG #4 FIX: Server-side search — bukan filter di frontend
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { name: searchRegex },
      { review: searchRegex },
    ];
  }

  if (isPublicRequest) {
    query.showOnLanding = true;
  }


  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  let [reviews, totalItems] = await Promise.all([
    Review.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Review.countDocuments(query),
  ]);

  if (isPublicRequest) {
    reviews = reviews.map((r) => {
      const reviewObj = r.toObject();
      delete reviewObj.contactPermission;
      delete reviewObj.email;
      delete reviewObj.phone;
      return reviewObj;
    });
  }

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
        },
      },
    },
    headers,
  );
}

const TIMEZONE = "Asia/Jakarta";

// "YYYY-MM-DD" of a Date, read in Jakarta wall-clock
const jktDateStr = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);

// "YYYY-MM" of a Date, read in Jakarta wall-clock
const jktMonthStr = (date) => jktDateStr(date).slice(0, 7);

// Last `count` Sunday-anchored week-start labels ("YYYY-MM-DD"), Jakarta TZ
function buildWeekPeriods(count, now) {
  const [y, m, d] = jktDateStr(now).split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d));
  anchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
  const periods = [];
  for (let i = count - 1; i >= 0; i--) {
    const wd = new Date(anchor);
    wd.setUTCDate(wd.getUTCDate() - i * 7);
    periods.push(
      `${wd.getUTCFullYear()}-${String(wd.getUTCMonth() + 1).padStart(2, "0")}-${String(wd.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return periods;
}

// Last `count` month labels ("YYYY-MM"), Jakarta TZ
function buildMonthPeriods(count, now) {
  const [y, m] = jktDateStr(now).split("-").map(Number);
  const periods = [];
  for (let i = count - 1; i >= 0; i--) {
    const md = new Date(Date.UTC(y, m - 1 - i, 1));
    periods.push(`${md.getUTCFullYear()}-${String(md.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

const STOPWORDS_ID = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "ini", "itu",
  "saya", "aku", "kamu", "kita", "kami", "mereka", "dia", "nya", "juga",
  "sudah", "belum", "akan", "atau", "tapi", "tetapi", "karena", "jadi",
  "adalah", "ada", "tidak", "gak", "ga", "nggak", "enggak", "bisa", "tidak",
  "banget", "sangat", "sekali", "sih", "aja", "saja", "nih", "deh", "dong",
  "lagi", "masih", "harus", "kalau", "kalo", "jika", "saat", "waktu", "biar",
  "agar", "supaya", "cuma", "hanya", "semua", "semoga", "terima", "kasih",
  "terimakasih", "makasih", "apk", "aplikasi", "splitbill", "split", "bill",
  "fitur", "yg", "dgn", "utk", "krn", "the", "and", "for", "app", "is",
  "this", "very", "good", "nice",
]);

function extractKeywords(texts, topN = 15) {
  const freq = new Map();
  for (const text of texts) {
    const words = (text || "")
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
    const seenInReview = new Set();
    for (const w of words) {
      if (w.length < 3 || STOPWORDS_ID.has(w) || seenInReview.has(w)) continue;
      seenInReview.add(w);
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

// Parses "[Drop-off Survey Step N] reason1, reason2 | Lainnya: free text" into
// { step: "N", reasons: ["reason1", "reason2", "Lainnya"] }. Returns null for
// non-survey review text.
const DROPOFF_SURVEY_RE = /^\[Drop-off Survey Step (\d+)\]\s*(.*)$/i;
const DROPOFF_OTHER_RE = /(?:\|\s*)?Lainnya:\s*(.*)$/i;

function parseDropOffSurvey(text) {
  const m = (text || "").match(DROPOFF_SURVEY_RE);
  if (!m) return null;
  const step = m[1];
  const body = m[2];
  const otherMatch = body.match(DROPOFF_OTHER_RE);
  let reasons;
  if (otherMatch) {
    const before = body.slice(0, otherMatch.index).trim();
    reasons = before ? before.split(",").map((s) => s.trim()).filter(Boolean) : [];
    reasons.push("Lainnya");
  } else {
    reasons = body.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return { step, reasons };
}

async function getReviewInsights(event, headers) {
  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000);

  const [
    trendRaw,
    byUserTypeRaw,
    byUsageRaw,
    abandonedUserIds,
    dropOffCohortRaw,
    dropOffByUserTypeRaw,
    negativeReviews,
    positiveReviews,
    registeredReviews,
    dropOffSurveyReviews,
  ] = await Promise.all([
    // Weekly rating trend + NPS-style split, last 12 weeks
    Review.aggregate([
      { $match: { createdAt: { $gte: twelveWeeksAgo } } },
      {
        $project: {
          rating: 1,
          weekStart: { $dateTrunc: { date: "$createdAt", unit: "week", timezone: TIMEZONE } },
        },
      },
      {
        $group: {
          _id: "$weekStart",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
          promoters: { $sum: { $cond: [{ $gte: ["$rating", 4] }, 1, 0] } },
          passives: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          detractors: { $sum: { $cond: [{ $lte: ["$rating", 2] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Segmentation: guest vs registered
    Review.aggregate([
      {
        $group: {
          _id: { $cond: [{ $eq: ["$userId", null] }, "Guest", "Terdaftar"] },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Segmentation: registered users bucketed by how many split bills they've made
    Review.aggregate([
      { $match: { userId: { $ne: null } } },
      {
        $lookup: {
          from: "splitbillrecords",
          localField: "userId",
          foreignField: "user",
          as: "bills",
        },
      },
      { $project: { rating: 1, billCount: { $size: "$bills" } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ["$billCount", 0] }, then: "Belum Pernah Split Bill" },
                { case: { $lte: ["$billCount", 3] }, then: "1-3 Bill" },
                { case: { $lte: ["$billCount", 10] }, then: "4-10 Bill" },
              ],
              default: "10+ Bill",
            },
          },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Users who have at least one abandoned (non-finalized) draft
    SplitBillRecord.distinct("user", {
      user: { $ne: null },
      last_step: { $in: ["STEP_1", "STEP_2", "STEP_3"] },
    }),

    // Drop-off funnel cohort trend, last 6 months
    SplitBillRecord.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, last_step: { $ne: null } } },
      {
        $project: {
          last_step: 1,
          monthStart: { $dateTrunc: { date: "$createdAt", unit: "month", timezone: TIMEZONE } },
        },
      },
      { $group: { _id: { month: "$monthStart", step: "$last_step" }, count: { $sum: 1 } } },
    ]),

    // Drop-off funnel split by guest vs registered user
    SplitBillRecord.aggregate([
      { $match: { last_step: { $ne: null } } },
      {
        $group: {
          _id: {
            type: { $cond: [{ $eq: ["$user", null] }, "Guest", "Terdaftar"] },
            step: "$last_step",
          },
          count: { $sum: 1 },
        },
      },
    ]),

    // Review text samples for keyword extraction
    Review.find({ rating: { $lte: 2 } }).select("review").limit(500).lean(),
    Review.find({ rating: { $gte: 4 } }).select("review").limit(500).lean(),

    // Registered-user reviews, for abandonment correlation
    Review.find({ userId: { $ne: null } }).select("userId rating").lean(),

    // Drop-off exit-survey submissions: "[Drop-off Survey Step N] reason1, reason2 | Lainnya: text"
    Review.find({ review: /^\[Drop-off Survey Step \d+\]/i }).select("review").lean(),
  ]);

  // --- Trend: fill gaps for last 12 weeks ---
  const trendMap = new Map(
    trendRaw.map((t) => [
      jktDateStr(t._id),
      {
        avgRating: t.avgRating,
        count: t.count,
        promoters: t.promoters,
        passives: t.passives,
        detractors: t.detractors,
      },
    ]),
  );
  const trend = buildWeekPeriods(12, now).map((period) => {
    const t = trendMap.get(period);
    const count = t?.count ?? 0;
    const promoters = t?.promoters ?? 0;
    const detractors = t?.detractors ?? 0;
    return {
      period,
      avgRating: t ? Math.round(t.avgRating * 10) / 10 : 0,
      count,
      promoters,
      passives: t?.passives ?? 0,
      detractors,
      satisfactionScore:
        count > 0 ? Math.round(((promoters - detractors) / count) * 100) : 0,
    };
  });

  // --- Drop-off cohort: fill gaps for last 6 months, per step ---
  const STEPS = ["STEP_1", "STEP_2", "STEP_3", "FINALIZED"];
  const cohortMap = new Map();
  for (const row of dropOffCohortRaw) {
    const key = jktMonthStr(row._id.month);
    if (!cohortMap.has(key)) cohortMap.set(key, {});
    cohortMap.get(key)[row._id.step] = row.count;
  }
  const dropOffCohort = buildMonthPeriods(6, now).map((period) => {
    const steps = cohortMap.get(period) || {};
    const entry = { period };
    for (const s of STEPS) entry[s] = steps[s] ?? 0;
    const total = STEPS.reduce((sum, s) => sum + entry[s], 0);
    entry.completionRate = total > 0 ? Math.round((entry.FINALIZED / total) * 100) : 0;
    return entry;
  });

  // --- Drop-off by user type ---
  const byUserTypeStepMap = new Map();
  for (const row of dropOffByUserTypeRaw) {
    const key = row._id.type;
    if (!byUserTypeStepMap.has(key)) byUserTypeStepMap.set(key, {});
    byUserTypeStepMap.get(key)[row._id.step] = row.count;
  }
  const dropOffByUserType = ["Guest", "Terdaftar"].map((type) => {
    const steps = byUserTypeStepMap.get(type) || {};
    const entry = { type };
    for (const s of STEPS) entry[s] = steps[s] ?? 0;
    const total = STEPS.reduce((sum, s) => sum + entry[s], 0);
    entry.completionRate = total > 0 ? Math.round((entry.FINALIZED / total) * 100) : 0;
    return entry;
  });

  // --- Segmentation: correlation with draft abandonment ---
  const abandonedSet = new Set(abandonedUserIds.map((id) => id.toString()));
  const abandonmentAgg = { "Pernah Abandon Draft": { total: 0, count: 0 }, "Tidak Pernah Abandon": { total: 0, count: 0 } };
  for (const r of registeredReviews) {
    const bucket = abandonedSet.has(r.userId.toString()) ? "Pernah Abandon Draft" : "Tidak Pernah Abandon";
    abandonmentAgg[bucket].total += r.rating;
    abandonmentAgg[bucket].count += 1;
  }
  const byAbandonment = Object.entries(abandonmentAgg)
    .filter(([, v]) => v.count > 0)
    .map(([label, v]) => ({
      label,
      avgRating: Math.round((v.total / v.count) * 10) / 10,
      count: v.count,
    }));

  // --- Drop-off exit-survey reasons, grouped by step ---
  const stepReasonCounts = new Map(); // step -> Map(reason -> count)
  const stepTotals = new Map(); // step -> submission count
  for (const doc of dropOffSurveyReviews) {
    const parsed = parseDropOffSurvey(doc.review);
    if (!parsed) continue;
    stepTotals.set(parsed.step, (stepTotals.get(parsed.step) || 0) + 1);
    if (!stepReasonCounts.has(parsed.step)) stepReasonCounts.set(parsed.step, new Map());
    const rc = stepReasonCounts.get(parsed.step);
    for (const reason of parsed.reasons) {
      rc.set(reason, (rc.get(reason) || 0) + 1);
    }
  }
  const dropOffReasons = [...stepReasonCounts.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([step, rc]) => ({
      step: Number(step),
      totalResponses: stepTotals.get(step) || 0,
      reasons: [...rc.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => ({ reason, count })),
    }));

  return jsonResponse(
    200,
    {
      success: true,
      data: {
        trend,
        segmentation: {
          byUserType: byUserTypeRaw.map((r) => ({
            type: r._id,
            avgRating: Math.round(r.avgRating * 10) / 10,
            count: r.count,
          })),
          byUsage: byUsageRaw.map((r) => ({
            bucket: r._id,
            avgRating: Math.round(r.avgRating * 10) / 10,
            count: r.count,
          })),
          byAbandonment,
        },
        dropOff: {
          cohort: dropOffCohort,
          byUserType: dropOffByUserType,
          reasons: dropOffReasons,
        },
        keywords: {
          negative: extractKeywords(negativeReviews.map((r) => r.review)),
          positive: extractKeywords(positiveReviews.map((r) => r.review)),
        },
      },
    },
    headers,
  );
}

export default handleReviews;
