import { HttpError } from "../../../lib/errors.js";

export function normalizeTrimmedString(value) {
  return typeof value === "string" ? value.trim() : undefined;
}

// Shared by receipt create (receipts.js) and update ([receiptId].js) so the
// totalAmount validation and merchant/notes trimming can't drift between them.
export function normalizeAmount(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    throw new HttpError(400, "Total belanja tidak valid");
  }
  return amount;
}
