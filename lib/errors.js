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

export function toHttpError(error, fallbackStatus = 500, fallbackMessage = "Internal server error") {
  if (error instanceof HttpError) {
    return error;
  }

  if (typeof error === "object" && error && "statusCode" in error && "message" in error) {
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
