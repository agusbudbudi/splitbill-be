import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import Participant from "../models/Participant.js";
import { authenticateToken } from "../middleware/auth.js";
import initMiddleware from "../../lib/init-middleware.js";

dotenv.config();

const corsMiddleware = initMiddleware(
  cors({
    origin: true,
    credentials: true,
  })
);

const connectDB = async () => {
  if (!mongoose.connection.readyState) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("Database configuration error");
    }
    await mongoose.connect(uri);
  }
};

const runAuth = (req, res) =>
  new Promise((resolve, reject) => {
    authenticateToken(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });

const mapParticipant = (participant) => ({
  id: participant._id.toString(),
  name: participant.name,
  createdAt: participant.createdAt,
  updatedAt: participant.updatedAt,
});

export default async function handler(req, res) {
  try {
    await corsMiddleware(req, res);

    if (!process.env.MONGO_URI) {
      return res.status(500).json({
        success: false,
        error: "Database configuration error",
      });
    }

    await connectDB();
    await runAuth(req, res);

    if (req.method === "GET") {
      const participants = await Participant.find({ user: req.user._id })
        .collation({ locale: "en", strength: 2 })
        .sort({ createdAt: 1 });

      return res.status(200).json({
        success: true,
        participants: participants.map(mapParticipant),
      });
    }

    if (req.method === "POST") {
      const { name } = req.body ?? {};
      const trimmedName = typeof name === "string" ? name.trim() : "";

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          error: "Nama peserta wajib diisi",
        });
      }

      const existing = await Participant.findOne({
        user: req.user._id,
        name: trimmedName,
      }).collation({ locale: "en", strength: 2 });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: "Peserta dengan nama ini sudah ada",
        });
      }

      const participant = await Participant.create({
        name: trimmedName,
        user: req.user._id,
      });

      return res.status(201).json({
        success: true,
        participant: mapParticipant(participant),
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  } catch (error) {
    console.error("Participants API error:", error);

    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
