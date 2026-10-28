import { HttpError } from "./errors.js";

const segmenter = new Intl.Segmenter("id", { granularity: "grapheme" });

/**
 * Visible character count: one per grapheme, so an emoji (even a ZWJ family or
 * flag with skin tone) counts as 1, matching what the admin sees. `.length`
 * would count UTF-16 code units and reject short emoji-heavy text.
 */
export function charCount(value) {
  let count = 0;
  for (const _ of segmenter.segment(value)) count += 1;
  return count;
}

/**
 * Trimmed text field. Takes the raw value plus a human-readable path for error
 * messages; rejects non-strings, and enforces `required` and `max` (graphemes).
 */
export function text(value, path, { required = false, max }) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new HttpError(400, `${path} harus berupa teks`);
  }
  const cleaned = (value || "").trim();
  if (required && !cleaned) {
    throw new HttpError(400, `${path} wajib diisi`);
  }
  const length = charCount(cleaned);
  if (length > max) {
    throw new HttpError(400, `${path} maksimal ${max} karakter (sekarang ${length})`);
  }
  return cleaned;
}
