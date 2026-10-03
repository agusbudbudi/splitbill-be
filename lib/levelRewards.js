// Single source of truth: benefit type -> User field it credits.
// Menambah benefit baru = tambah 1 entry di sini (+ field terkait di User model kalau perlu).
export const BENEFIT_TYPE_CONFIG = {
  free_scan_ai: { label: "Free Scan AI", userField: "freeScanCount" },
  max_split_bill: { label: "Maksimal Split Bill Created", userField: "freeSplitBillCount" },
};

export const BENEFIT_TYPE_VALUES = Object.keys(BENEFIT_TYPE_CONFIG);
