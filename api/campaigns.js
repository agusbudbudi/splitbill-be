import { connectDatabase } from "../lib/db.js";
import User from "../lib/models/User.js";
import Campaign from "../lib/models/Campaign.js";
import SplitBillRecord from "../lib/models/SplitBillRecord.js";
import { sendCampaignEmail } from "../lib/email.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { getQueryParams, parseJsonBody } from "../lib/parsers.js";
import { toHttpError, HttpError } from "../lib/errors.js";
import { buildSegmentPipeline } from "../lib/utils/segmentEvaluator.js";

export const getSegmentQuery = async (segment) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  switch (segment) {
    case "all":
      return {};
    case "unverified":
      return { isVerified: false };
    case "free":
      return { subscriptionStatus: "free" };
    case "free_scan_exhausted":
      return { subscriptionStatus: "free", freeScanCount: { $lte: 0 } };
    case "no_split_bill": {
      const activeUserIds = await SplitBillRecord.distinct("user");
      return { _id: { $nin: activeUserIds } };
    }
    case "inactive_30d":
      return {
        $or: [
          { lastLoginAt: { $lt: thirtyDaysAgo } },
          { lastLoginAt: null, createdAt: { $lt: thirtyDaysAgo } },
        ],
      };
    case "premium":
      return { subscriptionStatus: "active" };
    case "specific_emails":
      return null; // handled separately in getUsersForSegment
    default:
      return null;
  }
};

export async function getUsersForSegment(segment, dynamicSegment, specificEmails) {
  if (segment === "dynamic") {
    if (!dynamicSegment) throw new HttpError(400, "dynamicSegment is required");
    const pipeline = buildSegmentPipeline(dynamicSegment);
    pipeline.push({ $project: { email: 1, name: 1 } });
    return await User.aggregate(pipeline);
  } else if (segment === "specific_emails") {
    if (!specificEmails || specificEmails.length === 0)
      throw new HttpError(400, "specificEmails is required for this segment");
    const emails = specificEmails
      .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
      .filter(Boolean);
    // Look up existing users to get their names
    const existingUsers = await User.find({ email: { $in: emails } }).select("email name");
    const existingEmailMap = new Map(existingUsers.map((u) => [u.email, u]));
    // Return all input emails (registered or not)
    return emails.map((email) => existingEmailMap.get(email) || { email, name: email.split("@")[0] });
  } else {
    const segmentQuery = await getSegmentQuery(segment);
    if (!segmentQuery) throw new HttpError(400, "Invalid segment");
    return await User.find(segmentQuery).select("email name");
  }
}

async function getSegmentUserCount(segment, dynamicSegment, specificEmails) {
  if (segment === "specific_emails") {
    if (!specificEmails) return 0;
    const emails = specificEmails
      .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
      .filter(Boolean);
    return emails.length;
  } else if (segment === "dynamic") {
    if (!dynamicSegment) throw new HttpError(400, "dynamicSegment is required");
    const pipeline = buildSegmentPipeline(dynamicSegment);
    pipeline.push({ $count: "count" });
    const result = await User.aggregate(pipeline);
    return result[0] ? result[0].count : 0;
  } else {
    const segmentQuery = await getSegmentQuery(segment);
    if (!segmentQuery) throw new HttpError(400, "Invalid segment");
    return await User.countDocuments(segmentQuery);
  }
}

export async function handleCampaigns(event) {
  const headers = createCorsHeaders(event);

  if (event.httpMethod === "OPTIONS" || event.method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    const method = event.method || event.httpMethod || "GET";

    if (method === "GET") {
      const query = getQueryParams(event);
      const path = event.path || "";
      const url = event.url || "";

      if (path.includes("/preview") || url.includes("/preview")) {
        const { segment, dynamicSegment: dynamicSegmentStr, specificEmails: specificEmailsStr } = query;
        let dynamicSegment = null;
        let specificEmails = null;
        if (dynamicSegmentStr) {
          try {
            dynamicSegment = JSON.parse(dynamicSegmentStr);
          } catch (e) {
            throw new HttpError(400, "Invalid dynamicSegment JSON");
          }
        }
        if (specificEmailsStr) {
          try {
            specificEmails = JSON.parse(specificEmailsStr);
          } catch (e) {
            // treat as comma-separated string fallback
            specificEmails = specificEmailsStr.split(",").map((e) => e.trim()).filter(Boolean);
          }
        }
        
        const count = await getSegmentUserCount(segment, dynamicSegment, specificEmails);
        return jsonResponse(200, { success: true, count }, headers);
      }

      const campaigns = await Campaign.find().sort({ createdAt: -1 });
      return jsonResponse(200, { success: true, data: campaigns }, headers);
    }

    if (method === "POST") {
      const body = await parseJsonBody(event);
      const {
        name,
        segment,
        subject,
        content,
        ctaText,
        ctaUrl,
        isTest,
        testEmail,
        isDraft,
        initializeDraft,
        dynamicSegment,
        specificEmails,
      } = body;

      if (initializeDraft) {
        const campaign = await Campaign.create({
          status: "draft",
          name: body.name || "Draft Campaign " + new Date().toISOString().split("T")[0],
          segment: body.segment || "dynamic",
          dynamicSegment: body.dynamicSegment || { included: [], excluded: [] },
          specificEmails: body.specificEmails || [],
        });
        return jsonResponse(
          201,
          { success: true, data: campaign, message: "Draft initialized" },
          headers,
        );
      }

      if (isTest) {
        if (!testEmail) throw new HttpError(400, "Test email required");
        await sendCampaignEmail({
          email: testEmail,
          name: "Test User",
          subject: `[TEST] ${subject}`,
          content,
          ctaText,
          ctaUrl,
        });
        return jsonResponse(
          200,
          { success: true, message: "Test email sent" },
          headers,
        );
      }

      const users = await getUsersForSegment(segment, dynamicSegment, specificEmails);
      const recipientCount = users.length;

      const campaign = await Campaign.create({
        name,
        segment,
        dynamicSegment: segment === "dynamic" ? dynamicSegment : undefined,
        specificEmails: segment === "specific_emails" ? (specificEmails || []) : undefined,
        subject,
        content,
        ctaText,
        ctaUrl,
        recipientCount,
        recipientsList: isDraft ? undefined : users.map(u => ({ email: u.email, name: u.name })),
        status: isDraft ? "draft" : "pending",
      });

      if (isDraft) {
        return jsonResponse(
          201,
          {
            success: true,
            data: campaign,
            message: "Campaign saved as draft",
          },
          headers,
        );
      }

      // Batch sending logic to respect Resend's free tier rate limit (2 emails/sec)
      // We process 2 emails concurrently, then wait 1 second.
      // Note: In serverless, we might hit timeout for very large lists.
      const batchSize = 2;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (user) => {
            try {
              await sendCampaignEmail({
                email: user.email,
                name: user.name,
                subject,
                content,
                ctaText,
                ctaUrl,
              });
              successCount++;
            } catch (err) {
              console.error(`Failed to send to ${user.email}:`, err);
              failCount++;
            }
          }),
        );

        // Wait 1 second before sending the next batch
        if (i + batchSize < users.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      campaign.status = failCount === 0 ? "sent" : "failed";
      campaign.stats = {
        sentCount: successCount,
        failedCount: failCount,
      };
      if (failCount > 0) {
        campaign.failureReason = `${failCount} email gagal dikirim. Silakan periksa log pengiriman/koneksi provider email Resend Anda.`;
      } else {
        campaign.failureReason = undefined;
      }
      campaign.sentAt = new Date();
      await campaign.save();

      return jsonResponse(
        201,
        {
          success: true,
          data: campaign,
          stats: {
            total: recipientCount,
            success: successCount,
            failed: failCount,
          },
        },
        headers,
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    import("fs").then(fs => fs.writeFileSync("/Users/agudbudiman/Documents/1 PERSONAL PROJECT/splitbill-be/error.log", error.stack || error.toString()));
    console.error("Campaigns handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleCampaigns;
