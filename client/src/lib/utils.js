import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}

export function formatDateTime(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  };

  const formattedDate = date.toLocaleDateString("id-ID", dateOptions);
  const formattedTime = date.toLocaleTimeString("id-ID", timeOptions);

  return `${formattedDate} ${formattedTime}`;
}

const LAST_STEP_MAP = {
  add_participants: "Tambah Peserta",
  add_expenses: "Tambah Pengeluaran",
  add_payment_methods: "Tambah Metode Bayar",
  calculate: "Kalkulasi Tagihan",
  review: "Review Ringkasan",
  share: "Bagikan",
  finalize: "Finalisasi",
};

/**
 * Returns a human-readable Indonesian label for a split bill's last_step value.
 * Falls back to a title-cased version of the raw value if not in the map.
 */
export function formatLastStep(last_step, status) {
  if (!last_step) {
    return status === "locked" ? "Finalisasi" : "—";
  }
  return (
    LAST_STEP_MAP[last_step] ||
    last_step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

