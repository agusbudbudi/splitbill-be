import mongoose from "mongoose";

import Participant from "../models/Participant.js";
import { requireUser } from "../middleware/auth.js";
import { connectDatabase } from "../../lib/db.js";
import { createCorsHeaders, errorResponse, jsonResponse, noContentResponse } from "../../lib/http.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

export async function handleParticipantById(event, participantId) {
  const headers = createCorsHeaders(event);

  if (event.httpMethod === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    const user = await requireUser(event);

    if (event.httpMethod !== "DELETE") {
      throw new HttpError(405, `Method ${event.httpMethod} not allowed`);
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      throw new HttpError(400, "ID peserta tidak valid");
    }

    const participant = await Participant.findOneAndDelete({
      _id: participantId,
      user: user._id,
    });

    if (!participant) {
      throw new HttpError(404, "Peserta tidak ditemukan");
    }

    return jsonResponse(200, { success: true }, headers);
  } catch (error) {
    console.error("Delete participant error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleParticipantById;
