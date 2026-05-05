import dotenv from "dotenv";

import User from "../lib/models/User.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import Review from "../lib/models/Review.js";
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

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Build last-6-months array for filling gaps in trend data
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const [
      totalUsers,
      verifiedUsers,
      activeUsers,
      scanAdopted,
      scanExhausted,
      userGrowthRaw,
      billStats,
      billTrendRaw,
      activatedUsers,
      engagedUsers,
      reviewStats,
      ratingDistRaw,
      contactPermissionCount,
      topUsersRaw,
    ] = await Promise.all([
      // 1. total users
      User.countDocuments({}),

      // 2. verified users
      User.countDocuments({ isVerified: true }),

      // 3. active last 30 days
      User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } }),

      // 4. scan adopted (used at least 1 scan: freeScanCount < 10)
      User.countDocuments({ freeScanCount: { $lt: 10 } }),

      // 5. scan exhausted
      User.countDocuments({ freeScanCount: 0 }),

      // 6. user growth per month (last 6 months)
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
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

      // 8. split bill trend per month (last 6 months)
      SplitBillRecord.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
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
    ]);

    // Normalize trend data — fill missing months with 0
    const userGrowthMap = Object.fromEntries(
      userGrowthRaw.map(({ _id, count }) => [
        `${_id.year}-${String(_id.month).padStart(2, "0")}`,
        count,
      ])
    );
    const billTrendMap = Object.fromEntries(
      billTrendRaw.map(({ _id, count, totalValue }) => [
        `${_id.year}-${String(_id.month).padStart(2, "0")}`,
        { count, totalValue },
      ])
    );

    const userGrowth = last6Months.map((period) => ({
      period,
      count: userGrowthMap[period] ?? 0,
    }));

    const activityTrend = last6Months.map((period) => ({
      period,
      count: billTrendMap[period]?.count ?? 0,
      totalValue: billTrendMap[period]?.totalValue ?? 0,
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

    return jsonResponse(
      200,
      {
        success: true,
        data: {
          kpis: {
            totalUsers,
            verifiedUsers,
            verifiedRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
            activeUsers,
            totalBills: bs.totalBills,
            totalValue: Math.round(bs.totalValue),
            avgBillSize: bs.totalBills > 0 ? Math.round(bs.totalValue / bs.totalBills) : 0,
            avgParticipants: Math.round((bs.avgParticipants ?? 0) * 10) / 10,
            avgRating: rs.avgRating ? Math.round(rs.avgRating * 10) / 10 : 0,
            totalReviews,
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
          featureAdoption: {
            scanAdopted,
            scanExhausted,
            scanAdoptionRate: totalUsers > 0 ? Math.round((scanAdopted / totalUsers) * 100) : 0,
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
