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
        // Each Netlify Function container gets its own pool, and Atlas M0
        // caps total connections at 500 across all of them combined. A
        // burst of concurrent containers each opening up to 10 (with 2
        // pre-opened via minPoolSize) blows past that cap fast. Keep each
        // container's pool minimal and let idle sockets close quickly so
        // slots free up for the next burst instead of accumulating.
        maxPoolSize: 2,
        maxIdleTimeMS: 10000,
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
