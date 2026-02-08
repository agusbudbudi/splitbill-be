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

    // Sanitize URI for logging (remove password)
    const sanitizedUri = uri.replace(/:([^:@]+)@/, ":****@");

    connectionPromise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
        maxPoolSize: 10,
        minPoolSize: 2,
      })
      .then(() => {
        console.log("Database connected successfully");
      })
      .catch((error) => {
        connectionPromise = null; // Reset on error to allow retry
        console.error("Database connection error:", sanitizedUri);
        throw new Error("Failed to connect to database");
      });
  }

  await connectionPromise;
}
