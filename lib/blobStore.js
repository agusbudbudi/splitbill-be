import { getStore } from "@netlify/blobs";

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Jakarta

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Site-wide (not deploy-scoped) store — receipts must survive future deploys.
export function getReceiptsStore() {
  return getStore({ name: "receipts", consistency: "strong" });
}

// e.g. "28 July 2026" (Jakarta wall-clock) — all receipts uploaded on the same
// day land in the same folder, per product requirement.
export function buildUploadDateFolder(date = new Date()) {
  const jkt = new Date(date.getTime() + TZ_OFFSET_MS);
  const day = jkt.getUTCDate();
  const month = MONTH_NAMES[jkt.getUTCMonth()];
  const year = jkt.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
