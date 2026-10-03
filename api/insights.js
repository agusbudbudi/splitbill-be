import dotenv from "dotenv";

import User from "../lib/models/User.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import Review from "../lib/models/Review.js";
import Order from "../lib/models/Order.js";
import ScanLog from "../lib/models/ScanLog.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { HttpError, toHttpError } from "../lib/errors.js";
import { getCached, setCached } from "../lib/cache.js";

const INSIGHTS_CACHE_TTL_MS = 60 * 1000;

dotenv.config();

export async function handleInsights(event) {
  const headers = createCorsHeaders(event);
  const url = new URL(event.url || `http://localhost${event.path || ""}`);
  const granularity = url.searchParams.get("granularity") || "monthly";
  const scanGranularity = url.searchParams.get("scanGranularity") || "daily";

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    const method = event?.httpMethod || event?.method || "GET";
    if (method !== "GET") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();

    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    // Dashboard polls/refreshes shouldn't re-run ~35 aggregations every hit —
    // cache the computed response body per granularity combo for a short TTL.
    // Auth above always runs fresh; only the expensive data stage is cached.
    const cacheKey = `insights:${granularity}:${scanGranularity}`;
    const cachedBody = getCached(cacheKey);
    if (cachedBody) {
      return jsonResponse(200, cachedBody, headers);
    }

    const TIMEZONE = "Asia/Jakarta";
    const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

    // Percentage rounded to 2 decimal places (e.g. 38.33), not a whole number
    const pct = (numerator, denominator) =>
      denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Date whose UTC components represent Jakarta wall-clock — use getUTC* to read
    const nowJakarta = new Date(now.getTime() + TZ_OFFSET_MS);

    // Convert (year, month, day) Jakarta wall-clock to a real UTC Date
    const jktDate = (year, month, day, hour = 0, min = 0, sec = 0) =>
      new Date(Date.UTC(year, month, day, hour, min, sec) - TZ_OFFSET_MS);

    // Start-of-day, start-of-month boundaries (in Jakarta TZ, returned as UTC instants)
    const startOfTodayJkt = jktDate(
      nowJakarta.getUTCFullYear(),
      nowJakarta.getUTCMonth(),
      nowJakarta.getUTCDate(),
    );
    const startOfMonthJkt = jktDate(
      nowJakarta.getUTCFullYear(),
      nowJakarta.getUTCMonth(),
      1,
    );
    const startOfSixMonthsAgoJkt = jktDate(
      nowJakarta.getUTCFullYear(),
      nowJakarta.getUTCMonth() - 5,
      1,
    );

    // Build last-6-months array (Jakarta TZ) for filling gaps in trend data
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(
        nowJakarta.getUTCFullYear(),
        nowJakarta.getUTCMonth() - i,
        1,
      ));
      last6Months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }

    // Match MongoDB $week numbering with timezone (Sunday start; week 0 = days before first Sunday)
    // Input must be a Date whose UTC components represent Jakarta wall-clock.
    const mongoWeekJkt = (jakartaDate) => {
      const year = jakartaDate.getUTCFullYear();
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const firstSundayOffset = (7 - yearStart.getUTCDay()) % 7;
      const firstSunday = new Date(Date.UTC(year, 0, 1 + firstSundayOffset));
      if (jakartaDate < firstSunday) return 0;
      return Math.floor((jakartaDate - firstSunday) / (7 * 24 * 60 * 60 * 1000)) + 1;
    };

    const buildPeriods = (gran) => {
      const periods = [];
      if (gran === "daily") {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.UTC(
            nowJakarta.getUTCFullYear(),
            nowJakarta.getUTCMonth(),
            nowJakarta.getUTCDate() - i,
          ));
          periods.push(
            `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
          );
        }
      } else if (gran === "weekly") {
        // Start of current Jakarta-week (Sunday)
        const sundayJkt = new Date(nowJakarta);
        sundayJkt.setUTCDate(sundayJkt.getUTCDate() - sundayJkt.getUTCDay());
        sundayJkt.setUTCHours(0, 0, 0, 0);
        for (let i = 11; i >= 0; i--) {
          const d = new Date(sundayJkt);
          d.setUTCDate(d.getUTCDate() - i * 7);
          periods.push(`${d.getUTCFullYear()}-W${String(mongoWeekJkt(d)).padStart(2, "0")}`);
        }
      } else {
        return last6Months.slice();
      }
      return periods;
    };

    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Fixed last-30-days daily period list (independent of the granularity toggle)
    // — used for the AI Scan error-category-per-day chart.
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.UTC(
        nowJakarta.getUTCFullYear(),
        nowJakarta.getUTCMonth(),
        nowJakarta.getUTCDate() - i,
      ));
      last30Days.push(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
      );
    }

    // Fixed last-5-weeks period list (covers the last ~month) (independent of the granularity toggle)
    // — used for the AI Scan new-adopter (first-time scanner) trend.
    const last5WeekPeriods = [];
    const last5WeekStarts = {}; // period -> Sunday start date ("YYYY-MM-DD"), for date-range axis labels
    {
      const sundayJkt = new Date(nowJakarta);
      sundayJkt.setUTCDate(sundayJkt.getUTCDate() - sundayJkt.getUTCDay());
      sundayJkt.setUTCHours(0, 0, 0, 0);
      for (let i = 4; i >= 0; i--) {
        const d = new Date(sundayJkt);
        d.setUTCDate(d.getUTCDate() - i * 7);
        const period = `${d.getUTCFullYear()}-W${String(mongoWeekJkt(d)).padStart(2, "0")}`;
        last5WeekPeriods.push(period);
        last5WeekStarts[period] =
          `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }
    }

    // The Groq model outage that prompted the OpenRouter/Groq race rewrite
    // (see commit "fix dead Groq model") — surfaced on the adoption trend
    // chart so the drop-off is visually explained.
    const GROQ_INCIDENT_DATE_JKT = new Date(Date.UTC(2026, 6, 18));
    const incidentPeriod = `${GROQ_INCIDENT_DATE_JKT.getUTCFullYear()}-W${String(mongoWeekJkt(GROQ_INCIDENT_DATE_JKT)).padStart(2, "0")}`;

    // Categorize a ScanLog failure message into a fixed bucket for the
    // error-category-per-day chart. Order matters: the combined-failure
    // string can mention all three providers at once, so the most
    // actionable/specific cause wins.
    const categorizeScanError = (message) => {
      const msg = (message || "").toLowerCase();
      if (msg.includes("openrouter_api_key not set")) return "openrouterNotSet";
      if (msg.includes("gemini") && (msg.includes("quota") || msg.includes("429"))) return "quotaGemini";
      if (msg.includes("groq")) return "modelGroq";
      return "lainnya";
    };

    const [
      totalUsers,
      newUsersToday,
      verifiedUsers,
      activeUsers,
      scanAdopted,
      scanExhausted,
      totalScansRaw,
      userGrowthRaw,
      billStats,
      newBillsToday,
      billTrendRaw,
      activatedUsers,
      engagedUsers,
      reviewStats,
      topUsersRaw,
      scanExhaustedAndSubscribed,
      totalSubscribers,
      expiredSubscribers,
      pendingOrders,
      revenueMTD,
      planDistribution,
      revenueTrendRaw,
      providerDistributionRaw,
      splitBillStatusRaw,
      popularPaymentMethodsRaw,
      draftDropOffRaw,
      peakDaysRaw,
      groupSizesRaw,
      splitTypesRaw,
      scanTotalAttempts,
      scanSuccessCount,
      scanFailedCount,
      scanUniqueUsers,
      scanUniqueGuestIps,
      scanProviderStatsRaw,
      scanTrendRaw,
      scanErrorBreakdownRaw,
      scanPeakDaysRaw,
      topScanUsersRaw,
      scanLast7dTotal,
      scanLast7dFailed,
      scanLogs30dRaw,
      newScannerTrendRaw,
      scanModelTrendRaw,
    ] = await Promise.all([
      // 1. total users
      User.countDocuments({}),

      // 1.1 new users today (Jakarta TZ)
      User.countDocuments({
        createdAt: { $gte: startOfTodayJkt },
      }),

      // 2. verified users
      User.countDocuments({ isVerified: true }),

      // 3. active last 30 days
      User.countDocuments({ lastLoginAt: { $gte: thirtyDaysAgo } }),

      // 4. scan adopted: distinct logged-in users with >=1 successful scan.
      // Sourced from ScanLog, NOT freeScanCount: the quota is topped up by the
      // review reward (+5), level rewards and admin resets, and subscribers never
      // decrement it, so "5 - freeScanCount" drifts away from real usage.
      ScanLog.distinct("user", { status: "success", user: { $ne: null } }).then(
        (ids) => ids.length
      ),

      // 5. scan exhausted
      User.countDocuments({ freeScanCount: 0 }),

      // 5.1 total successful scans by logged-in users (ScanLog, same source as adopted)
      ScanLog.aggregate([
        { $match: { status: "success", user: { $ne: null } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),

      // 6. user growth per granularity (Jakarta TZ)
      User.aggregate([
        {
          $match: {
            createdAt: {
              $gte: granularity === "daily"
                ? new Date(now - 31 * 24 * 60 * 60 * 1000)
                : granularity === "weekly"
                  ? new Date(now - 13 * 7 * 24 * 60 * 60 * 1000)
                  : startOfSixMonthsAgoJkt,
            },
          },
        },
        {
          $group: {
            _id: granularity === "daily"
              ? {
                  year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                  month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
                  day: { $dayOfMonth: { date: "$createdAt", timezone: TIMEZONE } },
                }
              : granularity === "weekly"
                ? {
                    year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                    week: { $week: { date: "$createdAt", timezone: TIMEZONE } },
                  }
                : {
                    year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                    month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
                  },
            count: { $sum: 1 },
          },
        },
        {
          $sort: granularity === "daily"
            ? { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            : granularity === "weekly"
              ? { "_id.year": 1, "_id.week": 1 }
              : { "_id.year": 1, "_id.month": 1 },
        },
      ]),

      // 7. split bill total count + total value + avg participants
      SplitBillRecord.aggregate([
        {
          $group: {
            _id: null,
            totalBills: { $sum: 1 },
            totalValue: { $sum: "$summary.total" },
            avgParticipants: { $avg: { $size: "$participants" } },
          },
        },
      ]),

      // 7.1 new bills today (Jakarta TZ)
      SplitBillRecord.countDocuments({
        createdAt: { $gte: startOfTodayJkt },
      }),

      // 8. split bill trend per month (last 6 months, Jakarta TZ)
      SplitBillRecord.aggregate([
        { $match: { createdAt: { $gte: startOfSixMonthsAgoJkt } } },
        {
          $group: {
            _id: {
              year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
              month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
            },
            count: { $sum: 1 },
            totalValue: { $sum: "$summary.total" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // 9. funnel: activated — users with ≥1 split bill
      SplitBillRecord.distinct("user").then((ids) => ids.length),

      // 10. funnel: engaged — users with ≥2 split bills
      SplitBillRecord.aggregate([
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $match: { count: { $gte: 2 } } },
        { $count: "total" },
      ]).then((res) => res[0]?.total ?? 0),

      // 11. review avg rating + total count
      Review.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),

      // 14. top 10 users by split bill count
      SplitBillRecord.aggregate([
        { $group: { _id: "$user", splitBillCount: { $sum: 1 } } },
        { $sort: { splitBillCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            name: "$userInfo.name",
            email: "$userInfo.email",
            splitBillCount: 1,
          },
        },
      ]),

      // 15. scan exhausted but active subscription (conversion)
      User.countDocuments({ freeScanCount: 0, subscriptionStatus: "active" }),

      // 16. total active subscribers
      User.countDocuments({ subscriptionStatus: "active" }),

      // 16.1 total expired subscribers
      User.countDocuments({ subscriptionStatus: "expired" }),

      // 17. pending orders
      Order.countDocuments({ status: "pending" }),

      // 18. revenue MTD (month to date, Jakarta TZ)
      Order.aggregate([
        {
          $match: {
            status: "paid",
            paidAt: { $gte: startOfMonthJkt },
            isSandbox: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // 19. plan distribution
      User.aggregate([
        { $match: { subscriptionStatus: "active" } },
        { $group: { _id: "$subscriptionPlan", count: { $sum: 1 } } },
      ]),

      // 20. revenue trend (last 6 months, Jakarta TZ)
      Order.aggregate([
        {
          $match: {
            status: "paid",
            paidAt: { $gte: startOfSixMonthsAgoJkt },
            isSandbox: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: { date: "$paidAt", timezone: TIMEZONE } },
              month: { $month: { date: "$paidAt", timezone: TIMEZONE } },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // 21. provider distribution (normalize null/"" → "local")
      User.aggregate([
        {
          $group: {
            _id: {
              $cond: [{ $eq: ["$provider", "google"] }, "google", "local"],
            },
            count: { $sum: 1 },
          },
        },
      ]),


      // 22. split bill status distribution
      SplitBillRecord.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 23. popular payment methods
      SplitBillRecord.aggregate([
        { $unwind: "$paymentMethodSnapshots" },
        { $group: { _id: "$paymentMethodSnapshots.provider", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // 24. all last_step distribution (drafts + finalized)
      SplitBillRecord.aggregate([
        { $match: { last_step: { $ne: null } } },
        { $group: { _id: "$last_step", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 25. Peak activity days (day of week, last 30 days)
      SplitBillRecord.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dayOfWeek: { date: "$createdAt", timezone: TIMEZONE } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 26. Group size distribution
      SplitBillRecord.aggregate([
        {
          $project: {
            size: { $size: { $ifNull: ["$participants", []] } },
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$size", 2] },
                "2 Orang",
                {
                  $cond: [
                    { $and: [{ $gte: ["$size", 3] }, { $lte: ["$size", 5] }] },
                    "3-5 Orang",
                    {
                      $cond: [
                        { $and: [{ $gte: ["$size", 6] }, { $lte: ["$size", 10] }] },
                        "6-10 Orang",
                        {
                          $cond: [
                            { $gt: ["$size", 10] },
                            ">10 Orang",
                            "Lainnya"
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 27. Additional expense split type distribution
      SplitBillRecord.aggregate([
        { $unwind: "$additionalExpenses" },
        {
          $group: {
            _id: { $ifNull: ["$additionalExpenses.splitType", "equally"] },
            count: { $sum: 1 },
          },
        },
      ]),

      // 28. AI Scan: total attempts / success / failed
      ScanLog.countDocuments({}),
      ScanLog.countDocuments({ status: "success" }),
      ScanLog.countDocuments({ status: "failed" }),

      // 28.1 AI Scan: unique scanning users / unique guest IPs
      ScanLog.distinct("user").then((ids) => ids.filter(Boolean).length),
      ScanLog.distinct("ipAddress", { user: null }).then((ips) => ips.length),

      // 28.2 AI Scan: success/failed per provider
      ScanLog.aggregate([
        {
          $group: {
            _id: { provider: "$provider", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),

      // 28.3 AI Scan: success/failed trend per scanGranularity (Jakarta TZ)
      ScanLog.aggregate([
        {
          $match: {
            createdAt: {
              $gte: scanGranularity === "daily"
                ? new Date(now - 31 * 24 * 60 * 60 * 1000)
                : scanGranularity === "weekly"
                  ? new Date(now - 13 * 7 * 24 * 60 * 60 * 1000)
                  : startOfSixMonthsAgoJkt,
            },
          },
        },
        {
          $group: {
            _id: {
              ...(scanGranularity === "daily"
                ? {
                    year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                    month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
                    day: { $dayOfMonth: { date: "$createdAt", timezone: TIMEZONE } },
                  }
                : scanGranularity === "weekly"
                  ? {
                      year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                      week: { $week: { date: "$createdAt", timezone: TIMEZONE } },
                    }
                  : {
                      year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                      month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
                    }),
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 28.4 AI Scan: top failure reasons (last 7 days)
      ScanLog.aggregate([
        {
          $match: {
            status: "failed",
            errorMessage: { $ne: null },
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        { $group: { _id: "$errorMessage", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),

      // 28.5 AI Scan: peak scan days (day of week, last 30 days)
      ScanLog.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dayOfWeek: { date: "$createdAt", timezone: TIMEZONE } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 28.6 AI Scan: top scanning users
      ScanLog.aggregate([
        { $match: { user: { $ne: null } } },
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            name: "$userInfo.name",
            email: "$userInfo.email",
            count: 1,
          },
        },
      ]),

      // 28.7 AI Scan: last-7-days total / failed (for 7d failure rate)
      ScanLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      ScanLog.countDocuments({ createdAt: { $gte: sevenDaysAgo }, status: "failed" }),

      // 28.8/28.9 AI Scan: single fetch (last 30 days) driving both the
      // per-day error-category breakdown and the retry-rate calculation.
      // Previously the retry rate ran a per-document self-$lookup over the
      // whole collection (no index on ipAddress) — O(n^2)-ish and the
      // heaviest part of this endpoint. Sorted single-pass grouping below
      // is O(n log n) and reuses the same fetch for both features.
      ScanLog.find(
        { createdAt: { $gte: thirtyDaysAgo } },
        { createdAt: 1, errorMessage: 1, status: 1, user: 1, ipAddress: 1 },
      )
        .sort({ createdAt: 1 })
        .lean(),

      // 28.10 AI Scan: new adopters per week — first-ever scan attempt per user, bucketed by week
      ScanLog.aggregate([
        { $match: { user: { $ne: null } } },
        { $sort: { createdAt: 1 } },
        { $group: { _id: "$user", firstScanAt: { $first: "$createdAt" } } },
        {
          $group: {
            _id: {
              year: { $year: { date: "$firstScanAt", timezone: TIMEZONE } },
              week: { $week: { date: "$firstScanAt", timezone: TIMEZONE } },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } },
      ]),

      // 28.11 AI Scan: model (provider) usage trend per scanGranularity (Jakarta TZ)
      ScanLog.aggregate([
        {
          $match: {
            createdAt: {
              $gte: scanGranularity === "daily"
                ? new Date(now - 31 * 24 * 60 * 60 * 1000)
                : scanGranularity === "weekly"
                  ? new Date(now - 13 * 7 * 24 * 60 * 60 * 1000)
                  : startOfSixMonthsAgoJkt,
            },
          },
        },
        {
          $group: {
            _id: {
              ...(scanGranularity === "daily"
                ? {
                    year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                    month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
                    day: { $dayOfMonth: { date: "$createdAt", timezone: TIMEZONE } },
                  }
                : scanGranularity === "weekly"
                  ? {
                      year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                      week: { $week: { date: "$createdAt", timezone: TIMEZONE } },
                    }
                  : {
                      year: { $year: { date: "$createdAt", timezone: TIMEZONE } },
                      month: { $month: { date: "$createdAt", timezone: TIMEZONE } },
                    }),
              provider: "$provider",
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Normalize trend data — fill missing periods with 0
    const userGrowthMap = Object.fromEntries(
      userGrowthRaw
        .filter((item) => item._id && item._id.year != null)
        .map(({ _id, count }) => {
          let key;
          if (granularity === "daily") {
            key = `${_id.year}-${String(_id.month).padStart(2, "0")}-${String(_id.day).padStart(2, "0")}`;
          } else if (granularity === "weekly") {
            key = `${_id.year}-W${String(_id.week).padStart(2, "0")}`;
          } else {
            key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
          }
          return [key, count];
        })
    );
    const billTrendMap = Object.fromEntries(
      billTrendRaw
        .filter((item) => item._id && item._id.year && item._id.month)
        .map(({ _id, count, totalValue }) => [
          `${_id.year}-${String(_id.month).padStart(2, "0")}`,
          { count, totalValue },
        ])
    );

    const revenueTrendMap = Object.fromEntries(
      revenueTrendRaw
        .filter((item) => item._id && item._id.year && item._id.month)
        .map(({ _id, total }) => [
          `${_id.year}-${String(_id.month).padStart(2, "0")}`,
          total,
        ])
    );

    const userGrowthPeriods = buildPeriods(granularity);
    const scanTrendPeriods = buildPeriods(scanGranularity);
    const userGrowth = userGrowthPeriods.map((period) => ({
      period,
      count: userGrowthMap[period] ?? 0,
    }));

    const activityTrend = last6Months.map((period) => ({
      period,
      count: billTrendMap[period]?.count ?? 0,
      totalValue: billTrendMap[period]?.totalValue ?? 0,
    }));

    const revenueTrend = last6Months.map((period) => ({
      period,
      total: revenueTrendMap[period] ?? 0,
    }));

    const bs = billStats[0] ?? { totalBills: 0, totalValue: 0, avgParticipants: 0 };
    const rs = reviewStats[0] ?? { avgRating: 0, totalReviews: 0 };

    const totalReviews = rs.totalReviews ?? 0;

    // Normalize peak days
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const peakDaysMap = Object.fromEntries(peakDaysRaw.map(({ _id, count }) => [_id, count]));
    const peakDaysOrder = [2, 3, 4, 5, 6, 7, 1]; // Senin to Minggu
    const peakDays = peakDaysOrder.map((dayNum) => ({
      day: dayNames[dayNum - 1],
      count: peakDaysMap[dayNum] ?? 0,
    }));

    // Normalize group sizes
    const groupSizesMap = Object.fromEntries(groupSizesRaw.map(({ _id, count }) => [_id, count]));
    const groupSizes = ["2 Orang", "3-5 Orang", "6-10 Orang", ">10 Orang", "Lainnya"].map((label) => ({
      label,
      count: groupSizesMap[label] ?? 0,
    }));

    // Normalize additional split types
    const splitTypesMap = Object.fromEntries(splitTypesRaw.map(({ _id, count }) => [_id, count]));
    const additionalSplitTypes = [
      { type: "Sama Rata", count: splitTypesMap["equally"] ?? 0 },
      { type: "Proporsional", count: splitTypesMap["proportionally"] ?? 0 },
    ];
    const totalScans = totalScansRaw[0]?.total ?? 0;

    // Normalize AI scan provider stats (success/failed per provider)
    const scanProviderMap = {};
    scanProviderStatsRaw.forEach(({ _id, count }) => {
      const p = _id.provider;
      if (!scanProviderMap[p]) scanProviderMap[p] = { success: 0, failed: 0 };
      scanProviderMap[p][_id.status] = count;
    });
    const scanProviderStats = ["openrouter", "groq", "gemini"].map((provider) => ({
      provider,
      success: scanProviderMap[provider]?.success ?? 0,
      failed: scanProviderMap[provider]?.failed ?? 0,
      total:
        (scanProviderMap[provider]?.success ?? 0) +
        (scanProviderMap[provider]?.failed ?? 0),
    }));

    // Normalize AI scan trend (success/failed per period, per scanGranularity)
    const scanTrendMap = {};
    scanTrendRaw
      .filter((item) => item._id && item._id.year != null)
      .forEach(({ _id, count }) => {
        let key;
        if (scanGranularity === "daily") {
          key = `${_id.year}-${String(_id.month).padStart(2, "0")}-${String(_id.day).padStart(2, "0")}`;
        } else if (scanGranularity === "weekly") {
          key = `${_id.year}-W${String(_id.week).padStart(2, "0")}`;
        } else {
          key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
        }
        if (!scanTrendMap[key]) scanTrendMap[key] = { success: 0, failed: 0 };
        scanTrendMap[key][_id.status] = count;
      });
    const scanTrend = scanTrendPeriods.map((period) => ({
      period,
      success: scanTrendMap[period]?.success ?? 0,
      failed: scanTrendMap[period]?.failed ?? 0,
    }));

    // Normalize AI scan error breakdown
    const scanErrorBreakdown = scanErrorBreakdownRaw.map((e) => ({
      message: e._id,
      count: e.count,
    }));

    // Normalize AI scan peak days (reuses dayNames/peakDaysOrder from split-bill peak days)
    const scanPeakDaysMap = Object.fromEntries(
      scanPeakDaysRaw.map(({ _id, count }) => [_id, count])
    );
    const scanPeakDays = peakDaysOrder.map((dayNum) => ({
      day: dayNames[dayNum - 1],
      count: scanPeakDaysMap[dayNum] ?? 0,
    }));

    // Fallback rate: % of successful scans that had to fall back to Gemini
    // (OpenRouter + Groq are raced in parallel as co-primary; Gemini is the true last-resort fallback)
    const scanNonPrimarySuccess = scanProviderMap.gemini?.success ?? 0;
    const scanFallbackRate =
      scanSuccessCount > 0
        ? pct(scanNonPrimarySuccess, scanSuccessCount)
        : 0;

    // Overall + last-7-days failure/success rate
    const scanOverallFailureRate =
      scanTotalAttempts > 0 ? pct(scanFailedCount, scanTotalAttempts) : 0;
    const scanLast7dFailureRate =
      scanLast7dTotal > 0 ? pct(scanLast7dFailed, scanLast7dTotal) : 0;
    const scanLast7dSuccess = scanLast7dTotal - scanLast7dFailed;
    const scanLast7dSuccessRate =
      scanLast7dTotal > 0 ? pct(scanLast7dSuccess, scanLast7dTotal) : 0;

    // Single pass over scanLogs30dRaw (sorted by createdAt asc) drives both
    // the error-category breakdown and the retry-rate calculation.
    const errorCategoryMap = {};
    const retryGroups = new Map(); // "u:<id>" | "ip:<addr>" -> docs, time-ordered
    scanLogs30dRaw.forEach((doc) => {
      if (doc.status === "failed") {
        const d = new Date(doc.createdAt.getTime() + TZ_OFFSET_MS);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        if (!errorCategoryMap[key]) {
          errorCategoryMap[key] = { quotaGemini: 0, modelGroq: 0, openrouterNotSet: 0, lainnya: 0 };
        }
        errorCategoryMap[key][categorizeScanError(doc.errorMessage)] += 1;
      }

      const groupKey = doc.user ? `u:${doc.user}` : `ip:${doc.ipAddress}`;
      if (!retryGroups.has(groupKey)) retryGroups.set(groupKey, []);
      retryGroups.get(groupKey).push(doc);
    });
    const errorCategoryTrend = last30Days.map((date) => ({
      date,
      quotaGemini: errorCategoryMap[date]?.quotaGemini ?? 0,
      modelGroq: errorCategoryMap[date]?.modelGroq ?? 0,
      openrouterNotSet: errorCategoryMap[date]?.openrouterNotSet ?? 0,
      lainnya: errorCategoryMap[date]?.lainnya ?? 0,
    }));

    // Retry rate: a failed attempt counts as "retried" if the same user (or
    // guest IP) made another attempt within 2 minutes. Each group is already
    // time-ordered (global sort preserved per key), so the immediate next
    // doc in the group is the earliest possible retry — one pass, no join.
    const RETRY_WINDOW_MS = 2 * 60 * 1000;
    let retryTotalFailed = 0;
    let retryRetried = 0;
    const retryByDayMap = {};
    for (const docs of retryGroups.values()) {
      for (let i = 0; i < docs.length; i++) {
        if (docs[i].status !== "failed") continue;
        retryTotalFailed++;

        const failedAt = docs[i].createdAt.getTime();
        const dJkt = new Date(failedAt + TZ_OFFSET_MS);
        const dayKey = `${dJkt.getUTCFullYear()}-${String(dJkt.getUTCMonth() + 1).padStart(2, "0")}-${String(dJkt.getUTCDate()).padStart(2, "0")}`;
        if (!retryByDayMap[dayKey]) retryByDayMap[dayKey] = { totalFailed: 0, retried: 0 };
        retryByDayMap[dayKey].totalFailed++;

        // Skip same-millisecond ties (not strictly "after") before checking the window —
        // mirrors the original aggregation's strict $gt on createdAt.
        let j = i + 1;
        while (j < docs.length && docs[j].createdAt.getTime() <= failedAt) j++;
        const next = docs[j];
        const wasRetried = !!next && next.createdAt.getTime() - failedAt <= RETRY_WINDOW_MS;
        if (wasRetried) {
          retryRetried++;
          retryByDayMap[dayKey].retried++;
        }
      }
    }
    const retryStats = { totalFailed: retryTotalFailed, retried: retryRetried };
    const scanRetryRate =
      retryStats.totalFailed > 0
        ? pct(retryStats.retried, retryStats.totalFailed)
        : 0;
    const retryRateTrend = last30Days.map((date) => {
      const d = retryByDayMap[date] ?? { totalFailed: 0, retried: 0 };
      return {
        date,
        rate: pct(d.retried, d.totalFailed),
        retried: d.retried,
        totalFailed: d.totalFailed,
      };
    });

    // Model (provider) usage trend — same period buckets as scanTrend, split by provider
    const modelTrendMap = {};
    scanModelTrendRaw
      .filter((item) => item._id && item._id.year != null)
      .forEach(({ _id, count }) => {
        let key;
        if (scanGranularity === "daily") {
          key = `${_id.year}-${String(_id.month).padStart(2, "0")}-${String(_id.day).padStart(2, "0")}`;
        } else if (scanGranularity === "weekly") {
          key = `${_id.year}-W${String(_id.week).padStart(2, "0")}`;
        } else {
          key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
        }
        if (!modelTrendMap[key]) modelTrendMap[key] = { openrouter: 0, groq: 0, gemini: 0 };
        modelTrendMap[key][_id.provider] = count;
      });
    const modelTrend = scanTrendPeriods.map((period) => {
      const m = modelTrendMap[period] ?? { openrouter: 0, groq: 0, gemini: 0 };
      return {
        period,
        openrouter: m.openrouter,
        groq: m.groq,
        gemini: m.gemini,
        total: m.openrouter + m.groq + m.gemini,
      };
    });

    // New adopters per week (first-ever scan attempt), normalized to last 5 weeks
    const newScannerMap = Object.fromEntries(
      newScannerTrendRaw
        .filter((item) => item._id && item._id.year != null)
        .map(({ _id, count }) => [`${_id.year}-W${String(_id.week).padStart(2, "0")}`, count])
    );
    const newScannerTrend = last5WeekPeriods.map((period) => ({
      period,
      count: newScannerMap[period] ?? 0,
      weekStart: last5WeekStarts[period],
    }));

    const responseBody = {
      success: true,
      data: {
          kpis: {
            totalUsers,
            newUsersToday,
            verifiedUsers,
            verifiedRate: totalUsers > 0 ? pct(verifiedUsers, totalUsers) : 0,
            activeUsers,
            totalBills: bs.totalBills,
            newBillsToday,
            totalValue: Math.round(bs.totalValue),
            avgBillSize: bs.totalBills > 0 ? Math.round(bs.totalValue / bs.totalBills) : 0,
            avgParticipants: Math.round((bs.avgParticipants ?? 0) * 10) / 10,
            avgRating: rs.avgRating ? Math.round(rs.avgRating * 10) / 10 : 0,
            totalReviews,
            totalSubscribers,
            expiredSubscribers,
            pendingOrders,
            revenueMTD: revenueMTD[0]?.total ?? 0,
          },
          funnel: [
            { stage: "Registered", count: totalUsers, rate: 100 },
            {
              stage: "Verified",
              count: verifiedUsers,
              rate: totalUsers > 0 ? pct(verifiedUsers, totalUsers) : 0,
            },
            {
              stage: "Activated",
              count: activatedUsers,
              rate: totalUsers > 0 ? pct(activatedUsers, totalUsers) : 0,
            },
            {
              stage: "Engaged",
              count: engagedUsers,
              rate: totalUsers > 0 ? pct(engagedUsers, totalUsers) : 0,
            },
          ],
          userGrowth,
          activityTrend,
          revenueTrend,
          subscriptions: {
            planDistribution: planDistribution.map((p) => ({
              plan: p._id || "Unknown",
              count: p.count,
            })),
          },
          featureAdoption: {
            scanAdopted,
            scanExhausted,
            scanAdoptionRate: totalUsers > 0 ? pct(scanAdopted, totalUsers) : 0,
            totalScans,
            avgScansPerUser: scanAdopted > 0 ? Math.round((totalScans / scanAdopted) * 10) / 10 : 0,
            scanExhaustedAndSubscribed,
            powerUserConversionRate: scanExhausted > 0 ? pct(scanExhaustedAndSubscribed, scanExhausted) : 0,
          },
          topUsers: topUsersRaw,
          providers: providerDistributionRaw.map((p) => ({
            provider: p._id || "local",
            count: p.count,
          })),
          splitBillStatuses: splitBillStatusRaw.map((s) => ({
            status: s._id,
            count: s.count,
          })),
          paymentMethods: popularPaymentMethodsRaw.map((pm) => ({
            provider: pm._id,
            count: pm.count,
          })),
          draftDropOff: draftDropOffRaw.map((d) => ({
            step: d._id,
            count: d.count,
          })),
          peakDays,
          groupSizes,
          additionalSplitTypes,
          aiScan: {
            kpis: {
              totalAttempts: scanTotalAttempts,
              successCount: scanSuccessCount,
              failedCount: scanFailedCount,
              successRate:
                scanTotalAttempts > 0
                  ? pct(scanSuccessCount, scanTotalAttempts)
                  : 0,
              uniqueUsers: scanUniqueUsers,
              uniqueGuestScans: scanUniqueGuestIps,
              fallbackRate: scanFallbackRate,
              overallFailureRate: scanOverallFailureRate,
              last7dTotal: scanLast7dTotal,
              last7dFailed: scanLast7dFailed,
              last7dFailureRate: scanLast7dFailureRate,
              last7dSuccess: scanLast7dSuccess,
              last7dSuccessRate: scanLast7dSuccessRate,
              retryRate: scanRetryRate,
              retriedCount: retryStats.retried,
              retryEligibleCount: retryStats.totalFailed,
            },
            providerStats: scanProviderStats,
            trend: scanTrend,
            modelTrend,
            errorBreakdown: scanErrorBreakdown,
            errorCategoryTrend,
            peakDays: scanPeakDays,
            topScanUsers: topScanUsersRaw,
            newScannerTrend,
            incidentPeriod,
            retryRateTrend,
          },
        },
      };

    setCached(cacheKey, responseBody, INSIGHTS_CACHE_TTL_MS);
    return jsonResponse(200, responseBody, headers);
  } catch (error) {
    console.error("Insights handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleInsights;
