import mongoose from "mongoose";

import SplitBillRecord from "../../../lib/models/SplitBillRecord.js";
import { connectDatabase } from "../../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../../lib/http.js";
import { parseJsonBody } from "../../../lib/parsers.js";
import { HttpError, toHttpError } from "../../../lib/errors.js";
import { mapDraft } from "./utils.js";

/**
 * POST /api/split-bills/drafts
 * Create a new draft at Step 1. Auth is optional.
 * Guest users: user = null
 * Authenticated users: user = user._id
 */
export async function handleCreateDraft(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    if (method !== "POST") {
      throw new HttpError(405, `Method ${method} not allowed`);
    }

    await connectDatabase();

    // Optional auth — resolve user if token present, null otherwise
    let userId = null;
    try {
      const { requireUser } = await import("../../../lib/middleware/auth.js");
      const user = await requireUser(event);
      userId = user._id;
    } catch (authErr) {
      if (authErr.statusCode !== 401) {
        throw authErr;
      }
      // No token — guest session
    }

    const payload = await parseJsonBody(event);

    // Participants — optional at creation but validated if provided
    const rawParticipants = Array.isArray(payload?.participants)
      ? payload.participants
      : [];
    const participants = rawParticipants.map((p) => {
      if (!p || typeof p !== "object") {
        throw new HttpError(400, "Data peserta tidak valid");
      }
      const id = typeof p.id === "string" ? p.id.trim() : "";
      const name = typeof p.name === "string" ? p.name.trim() : "";
      if (!id || !name) {
        throw new HttpError(400, "ID dan nama peserta wajib diisi");
      }
      return { id, name };
    });

    // Optional Step 1 fields (activityName/occurredAt collected later in Step 3)
    const activityName =
      typeof payload?.activityName === "string"
        ? payload.activityName.trim()
        : undefined;
    const occurredAtRaw =
      typeof payload?.occurredAt === "string" ? payload.occurredAt : null;
    const occurredAt =
      occurredAtRaw && !Number.isNaN(Date.parse(occurredAtRaw))
        ? new Date(occurredAtRaw)
        : undefined;

    const draft = await SplitBillRecord.create({
      user: userId,
      status: "editable",   // editable = DRAFT
      last_step: "STEP_1",
      ...(activityName && { activityName }),
      ...(occurredAt && { occurredAt }),
      participants,
    });

    return jsonResponse(
      201,
      {
        success: true,
        draft: mapDraft(draft),
      },
      headers
    );
  } catch (error) {
    console.error("Create draft handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleCreateDraft;
