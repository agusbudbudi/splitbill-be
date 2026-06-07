import dotenv from "dotenv";

import User from "../lib/models/User.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import Review from "../lib/models/Review.js";
import Order from "../lib/models/Order.js";
import { connectDatabase } from "../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { HttpError, toHttpError } from "../lib/errors.js";

dotenv.config();

export async function handleInsights(event) {
  const headers = createCorsHeaders(event);
  const url = new URL(event.url || `http://localhost${event.path || ""}`);
  const granularity = url.searchParams.get("granularity") || "monthly";

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

    const TIMEZONE = "Asia/Jakarta";
    const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

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

    const buildUserGrowthPeriods = () => {
      const periods = [];
      if (granularity === "daily") {
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
      } else if (granularity === "weekly") {
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
      billTrendRaw,
      activatedUsers,
      engagedUsers,
      reviewStats,
      ratingDistRaw,
      contactPermissionCount,
      topUsersRaw,
      scanExhaustedAndSubscribed,
      totalSubscribers,
      pendingOrders,
      revenueMTD,
      planDistribution,
      revenueTrendRaw,
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

      // 4. scan adopted (used at least 1 scan: freeScanCount < 5)
      User.countDocuments({ freeScanCount: { $lt: 5 } }),

      // 5. scan exhausted
      User.countDocuments({ freeScanCount: 0 }),

      // 5.1 total scans performed (sum of 5 - freeScanCount)
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $subtract: [5, "$freeScanCount"] } },
          },
        },
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

      // 12. rating distribution
      Review.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 13. contact permission count
      Review.countDocuments({ contactPermission: true }),

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

    const userGrowthPeriods = buildUserGrowthPeriods();
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

    // Normalize rating distribution (ensure all 1-5 present)
    const ratingMap = Object.fromEntries(ratingDistRaw.map(({ _id, count }) => [_id, count]));
    const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: ratingMap[r] ?? 0,
    }));

    const bs = billStats[0] ?? { totalBills: 0, totalValue: 0, avgParticipants: 0 };
    const rs = reviewStats[0] ?? { avgRating: 0, totalReviews: 0 };

    const totalReviews = rs.totalReviews ?? 0;
    const totalScans = totalScansRaw[0]?.total ?? 0;

    return jsonResponse(
      200,
      {
        success: true,
        data: {
          kpis: {
            totalUsers,
            newUsersToday,
            verifiedUsers,
            verifiedRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
            activeUsers,
            totalBills: bs.totalBills,
            totalValue: Math.round(bs.totalValue),
            avgBillSize: bs.totalBills > 0 ? Math.round(bs.totalValue / bs.totalBills) : 0,
            avgParticipants: Math.round((bs.avgParticipants ?? 0) * 10) / 10,
            avgRating: rs.avgRating ? Math.round(rs.avgRating * 10) / 10 : 0,
            totalReviews,
            totalSubscribers,
            pendingOrders,
            revenueMTD: revenueMTD[0]?.total ?? 0,
          },
          funnel: [
            { stage: "Registered", count: totalUsers, rate: 100 },
            {
              stage: "Verified",
              count: verifiedUsers,
              rate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
            },
            {
              stage: "Activated",
              count: activatedUsers,
              rate: totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0,
            },
            {
              stage: "Engaged",
              count: engagedUsers,
              rate: totalUsers > 0 ? Math.round((engagedUsers / totalUsers) * 100) : 0,
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
            scanAdoptionRate: totalUsers > 0 ? Math.round((scanAdopted / totalUsers) * 100) : 0,
            totalScans,
            avgScansPerUser: scanAdopted > 0 ? Math.round((totalScans / scanAdopted) * 10) / 10 : 0,
            scanExhaustedAndSubscribed,
            powerUserConversionRate: scanExhausted > 0 ? Math.round((scanExhaustedAndSubscribed / scanExhausted) * 100) : 0,
          },
          reviews: {
            ratingDistribution,
            contactPermissionCount,
            contactPermissionRate:
              totalReviews > 0 ? Math.round((contactPermissionCount / totalReviews) * 100) : 0,
          },
          topUsers: topUsersRaw,
        },
      },
      headers,
    );
  } catch (error) {
    console.error("Insights handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleInsights;
