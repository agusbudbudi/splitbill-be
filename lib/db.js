import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let connectionPromise = null;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("Database configuration error");
    }

    connectionPromise = mongoose.connect(uri);
  }

  await connectionPromise;
}
