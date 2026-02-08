import { HttpError } from "../errors.js";

const MAX_REQUEST_SIZE_BYTES =
  (parseInt(process.env.MAX_REQUEST_SIZE_MB) || 10) * 1024 * 1024; // 10MB default
const MAX_IMAGE_SIZE_BYTES =
  (parseInt(process.env.MAX_IMAGE_SIZE_MB) || 5) * 1024 * 1024; // 5MB default
const MAX_JSON_DEPTH = 10;

/**
 * Get content length from event
 */
function getContentLength(event) {
  const headers = event?.headers || {};

  try {
    if (headers && typeof headers.get === "function") {
      return parseInt(headers.get("content-length") || "0");
    }
  } catch (_) {}

  return parseInt(
    headers["content-length"] || headers["Content-Length"] || "0",
  );
}

/**
 * Validate request size
 */
export function validateRequestSize(event, maxSize = MAX_REQUEST_SIZE_BYTES) {
  const contentLength = getContentLength(event);

  if (contentLength > maxSize) {
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2);
    throw new HttpError(
      413,
      `Request body too large. Maximum size is ${maxSizeMB}MB`,
    );
  }
}

/**
 * Validate image size for upload endpoints
 */
export function validateImageSize(event) {
  validateRequestSize(event, MAX_IMAGE_SIZE_BYTES);
}

/**
 * Calculate JSON depth
 */
function getJsonDepth(obj, currentDepth = 0) {
  if (currentDepth > MAX_JSON_DEPTH) {
    return currentDepth;
  }

  if (obj === null || typeof obj !== "object") {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const depth = getJsonDepth(obj[key], currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * Validate JSON depth to prevent stack overflow
 */
export function validateJsonDepth(data) {
  const depth = getJsonDepth(data);

  if (depth > MAX_JSON_DEPTH) {
    throw new HttpError(
      400,
      `JSON structure too deep. Maximum depth is ${MAX_JSON_DEPTH}`,
    );
  }
}

/**
 * Validate base64 image size
 */
export function validateBase64ImageSize(
  base64String,
  maxSizeBytes = MAX_IMAGE_SIZE_BYTES,
) {
  if (!base64String || typeof base64String !== "string") {
    throw new HttpError(400, "Invalid base64 image data");
  }

  // Calculate approximate size (base64 is ~33% larger than binary)
  const sizeBytes = (base64String.length * 3) / 4;

  if (sizeBytes > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(2);
    throw new HttpError(413, `Image too large. Maximum size is ${maxSizeMB}MB`);
  }
}

/**
 * Validate MIME type against allowlist
 */
export function validateMimeType(mimeType, allowedTypes) {
  if (!mimeType || typeof mimeType !== "string") {
    throw new HttpError(400, "MIME type is required");
  }

  const normalizedMimeType = mimeType.toLowerCase().trim();

  if (!allowedTypes.includes(normalizedMimeType)) {
    throw new HttpError(
      400,
      `Invalid MIME type. Allowed types: ${allowedTypes.join(", ")}`,
    );
  }
}

/**
 * Middleware wrapper for request validation
 */
export function requestValidationMiddleware(options = {}) {
  return (event) => {
    if (options.validateSize !== false) {
      validateRequestSize(event, options.maxSize);
    }
  };
}
