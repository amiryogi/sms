/**
 * Display formatting shared by pages. Dates are stored in AD; these only
 * format them (Bikram Sambat strings come from the backend where needed).
 */

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "14 Apr 2025" */
export const formatDate = (value, fallback = "—") => {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : fallback;
};

/** "14 Apr 2025, 10:30" */
export const formatDateTime = (value, fallback = "—") => {
  const d = toDate(value);
  return d
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : fallback;
};

/** "2 days ago" / "in 3 days" / "today" */
export const formatRelative = (value) => {
  const d = toDate(value);
  if (!d) return "";
  const days = Math.round((d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  return days < 0 ? `${-days} days ago` : `in ${days} days`;
};

/** Value for <input type="date"> from an ISO date or Date. */
export const toDateInput = (value) => {
  const d = toDate(value);
  return d ? d.toISOString().split("T")[0] : "";
};

/** "Rs. 12,500" (Nepali rupees, Indian digit grouping). */
export const formatCurrency = (value, { decimals = 0 } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: 2 })}`;
};

/** "1,234" */
export const formatNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "—";
};

/**
 * "Ram Bahadur Thapa" from { firstName, middleName, lastName } (or a user nested
 * inside). The middle name is optional. Every name the UI shows goes through here.
 */
export const fullName = (person) => {
  const p = person?.user || person || {};
  return [p.firstName, p.middleName, p.lastName]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
};
