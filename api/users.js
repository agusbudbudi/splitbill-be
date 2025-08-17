import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js"; // Adjust the path as necessary

dotenv.config();

// Handler to get all users
export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      // Connect to the database
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGO_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
      }

      // Fetch all users
      const users = await User.find({});

      // Return the users
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    // Handle unsupported methods
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
