import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import User from "../models/User.js";
import { connectDatabase } from "../../lib/db.js";
import { HttpError } from "../../lib/errors.js";

dotenv.config();

const BEARER_PREFIX = "Bearer ";

function extractToken(headersArg = {}) {
  let authorization = null;
  try {
    if (headersArg && typeof headersArg.get === "function") {
      authorization =
        headersArg.get("authorization") ||
        headersArg.get("Authorization") ||
        null;
    } else {
      authorization =
        headersArg.authorization || headersArg.Authorization || null;
    }
  } catch (_) {
    authorization = null;
  }

  if (authorization && authorization.startsWith(BEARER_PREFIX)) {
    return authorization.slice(BEARER_PREFIX.length).trim();
  }
  return null;
}

export async function requireUser(event) {
  await connectDatabase();

  const token = extractToken(event?.headers);

  if (!token) {
    throw new HttpError(401, "Access token required");
  }

  if (!process.env.JWT_SECRET) {
    throw new HttpError(500, "Authentication configuration error");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new HttpError(401, "Invalid token - user not found");
    }

    return user;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new HttpError(401, "Token expired");
    }

    if (error.name === "JsonWebTokenError") {
      throw new HttpError(401, "Invalid token");
    }

    console.error("Authentication error:", error);
    throw new HttpError(500, "Authentication failed");
  }
}

export const generateTokens = (userId) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new HttpError(500, "Authentication configuration error");
  }

  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new HttpError(401, "Invalid refresh token");
  }
};
