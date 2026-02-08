export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}

export function toHttpError(
  error,
  fallbackStatus = 500,
  fallbackMessage = "Internal server error",
) {
  if (error instanceof HttpError) {
    return error;
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === "production") {
    // Log the actual error for debugging
    console.error("Internal error:", error);

    // For known error types, preserve the status code but use generic message
    const statusCode = error?.status || error?.statusCode || fallbackStatus;

    // Only expose client errors (4xx), hide server errors (5xx)
    if (statusCode >= 400 && statusCode < 500) {
      return new HttpError(statusCode, error?.message || fallbackMessage);
    }

    // Return generic error for server errors
    return new HttpError(500, "An error occurred processing your request");
  }

  // In development, return detailed errors
  if (
    typeof error === "object" &&
    error &&
    "statusCode" in error &&
    "message" in error
  ) {
    return new HttpError(error.statusCode, error.message, error.details);
  }

  const statusCode = error?.status || error?.statusCode || fallbackStatus;
  const message = error?.message || fallbackMessage;

  const httpError = new HttpError(statusCode, message);
  if (error?.details) {
    httpError.details = error.details;
  }
  return httpError;
}
