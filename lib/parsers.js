import { HttpError } from "./errors.js";

export function parseJsonBody(event) {
  if (!event?.body) {
    return {};
  }

  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (error) {
    throw new HttpError(400, "Invalid JSON payload");
  }
}

export function getQueryParams(event) {
  return event?.queryStringParameters || {};
}
