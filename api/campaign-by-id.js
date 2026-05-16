import Campaign from "../lib/models/Campaign.js";
import User from "../lib/models/User.js";
import { connectDatabase } from "../lib/db.js";
import { sendCampaignEmail } from "../lib/email.js";
import { getSegmentQuery, getUsersForSegment } from "./campaigns.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../lib/http.js";
import { parseJsonBody } from "../lib/parsers.js";
import { HttpError, toHttpError } from "../lib/errors.js";

export default async function handleCampaignById(event, campaignId) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") return noContentResponse(headers);

  try {
    await connectDatabase();
    const { requireAdmin } = await import("../lib/middleware/auth.js");
    await requireAdmin(event);

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new HttpError(404, "Campaign not found");

    if (method === "GET") {
      return jsonResponse(200, { success: true, data: campaign }, headers);
    }

    if (method === "PUT") {
      if (campaign.status !== "draft") {
        throw new HttpError(400, "Only draft campaigns can be edited");
      }
      const body = await parseJsonBody(event);
      const { name, segment, subject, content, ctaText, ctaUrl, dynamicSegment } = body;
      
      const users = await getUsersForSegment(segment || campaign.segment, dynamicSegment || campaign.dynamicSegment);
      const recipientCount = users.length;

      campaign.name = name || campaign.name;
      campaign.segment = segment || campaign.segment;
      campaign.subject = subject || campaign.subject;
      campaign.content = content || campaign.content;
      campaign.ctaText = ctaText !== undefined ? ctaText : campaign.ctaText;
      campaign.ctaUrl = ctaUrl !== undefined ? ctaUrl : campaign.ctaUrl;
      if (segment === "dynamic") {
        campaign.dynamicSegment = dynamicSegment || campaign.dynamicSegment;
      } else if (segment) {
        campaign.dynamicSegment = undefined;
      }
      campaign.recipientCount = recipientCount;

      await campaign.save();

      return jsonResponse(200, { success: true, data: campaign }, headers);
    }

    if (method === "POST") {
      // Send draft campaign
      if (campaign.status !== "draft") {
        throw new HttpError(400, "Only draft campaigns can be sent this way");
      }

      campaign.status = "pending";
      await campaign.save();

      const users = await getUsersForSegment(campaign.segment, campaign.dynamicSegment);
      
      campaign.recipientCount = users.length;
      await campaign.save();

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
                subject: campaign.subject,
                content: campaign.content,
                ctaText: campaign.ctaText,
                ctaUrl: campaign.ctaUrl,
              });
              successCount++;
            } catch (err) {
              console.error(`Failed to send to ${user.email}:`, err);
              failCount++;
            }
          }),
        );

        if (i + batchSize < users.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      campaign.status = failCount === 0 ? "sent" : "failed";
      campaign.sentAt = new Date();
      await campaign.save();

      return jsonResponse(
        200,
        {
          success: true,
          data: campaign,
          stats: {
            total: users.length,
            success: successCount,
            failed: failCount,
          },
        },
        headers,
      );
    }

    if (method === "DELETE") {
      if (campaign.status !== "draft") {
        throw new HttpError(400, "Only draft campaigns can be deleted");
      }
      await Campaign.findByIdAndDelete(campaignId);
      return jsonResponse(200, { success: true, message: "Campaign deleted" }, headers);
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("CampaignById handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}
