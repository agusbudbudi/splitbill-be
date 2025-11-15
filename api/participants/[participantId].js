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

export default async function handler(req, res) {
  const {
    query: { participantId },
  } = req;

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

    if (req.method !== "DELETE") {
      res.setHeader("Allow", ["DELETE"]);
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      return res.status(400).json({
        success: false,
        error: "ID peserta tidak valid",
      });
    }

    const participant = await Participant.findOneAndDelete({
      _id: participantId,
      user: req.user._id,
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: "Peserta tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Delete participant error:", error);

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
