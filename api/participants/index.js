import Participant from "../models/Participant.js";
import { requireUser } from "../middleware/auth.js";
import { connectDatabase } from "../../lib/db.js";
import {
  createCorsHeaders,
  errorResponse,
  jsonResponse,
  noContentResponse,
} from "../../lib/http.js";
import { parseJsonBody } from "../../lib/parsers.js";
import { HttpError, toHttpError } from "../../lib/errors.js";

const mapParticipant = (participant) => ({
  id: participant._id.toString(),
  name: participant.name,
  createdAt: participant.createdAt,
  updatedAt: participant.updatedAt,
});

export async function handleParticipants(event) {
  const headers = createCorsHeaders(event);
  const method = event?.httpMethod || event?.method || "GET";

  if (method === "OPTIONS") {
    return noContentResponse(headers);
  }

  try {
    await connectDatabase();
    const user = await requireUser(event);

    if (method === "GET") {
      const participants = await Participant.find({ user: user._id })
        .collation({ locale: "en", strength: 2 })
        .sort({ createdAt: 1 });

      return jsonResponse(
        200,
        {
          success: true,
          participants: participants.map(mapParticipant),
        },
        headers
      );
    }

    if (method === "POST") {
      const { name } = await parseJsonBody(event);
      const trimmedName = typeof name === "string" ? name.trim() : "";

      if (!trimmedName) {
        throw new HttpError(400, "Nama peserta wajib diisi");
      }

      const existing = await Participant.findOne({
        user: user._id,
        name: trimmedName,
      }).collation({ locale: "en", strength: 2 });

      if (existing) {
        throw new HttpError(409, "Peserta dengan nama ini sudah ada");
      }

      const participant = await Participant.create({
        name: trimmedName,
        user: user._id,
      });

      return jsonResponse(
        201,
        {
          success: true,
          participant: mapParticipant(participant),
        },
        headers
      );
    }

    throw new HttpError(405, `Method ${method} not allowed`);
  } catch (error) {
    console.error("Participants handler error:", error);
    return errorResponse(toHttpError(error), headers);
  }
}

export default handleParticipants;
