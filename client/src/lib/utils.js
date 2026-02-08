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
