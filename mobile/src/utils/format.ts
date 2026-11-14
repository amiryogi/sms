/**
 * Display formatting. Values come from the API; these only format them.
 * Names: every displayed name goes through fullName() (CLAUDE.md §6), so the
 * optional middle name is never lost.
 */
import { formatBs } from "./nepaliDate";

type Named = { firstName?: string | null; middleName?: string | null; lastName?: string | null };

/** "Ram Bahadur Thapa" from { firstName, middleName, lastName } or { user: {...} }. */
export const fullName = (person: (Named & { user?: Named | null }) | null | undefined): string => {
  const p: Named = person?.user ?? person ?? {};
  return [p.firstName, p.middleName, p.lastName]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
};

/** "RT" for an avatar. */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .join("");

const toDate = (value: Date | string | number | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** True when the value is a date-only column (UTC midnight), as the backend sends @db.Date. */
const isDateOnly = (d: Date) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

/** "14 Apr 2025" (AD). A date-only value keeps its calendar day in every timezone. */
export const formatAd = (value: Date | string | number | null | undefined, fallback = "—"): string => {
  const d = toDate(value);
  if (!d) return fallback;
  return isDateOnly(d)
    ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "14 Apr 2025, 10:30" (device time). */
export const formatDateTime = (value: Date | string | number | null | undefined, fallback = "—"): string => {
  const d = toDate(value);
  if (!d) return fallback;
  return `${formatAd(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12))}, ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
};

/**
 * The app's standard date: BS first, AD after, e.g. "27 Kartik 2083 (13 Nov 2026)".
 * `mode` picks one calendar only.
 */
export const formatDate = (
  value: Date | string | number | null | undefined,
  mode: "both" | "bs" | "ad" = "both",
  fallback = "—",
): string => {
  if (!toDate(value)) return fallback;
  if (mode === "bs") return formatBs(value);
  if (mode === "ad") return formatAd(value);
  return `${formatBs(value)} (${formatAd(value)})`;
};

/** "today", "yesterday", "in 3 days", "2 days ago", against `now`'s calendar day. */
export const formatRelativeDay = (value: Date | string | number | null | undefined, now: Date = new Date()): string => {
  const d = toDate(value);
  if (!d) return "";
  const day = (x: Date, dateOnly: boolean) =>
    dateOnly ? Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) : Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const days = Math.round((day(d, isDateOnly(d)) - day(now, false)) / 86400000);
  if (days === 0) return "today";
  if (days === -1) return "yesterday";
  if (days === 1) return "tomorrow";
  return days < 0 ? `${-days} days ago` : `in ${days} days`;
};

/** Indian digit grouping: 1234567 -> "12,34,567". */
const groupIndian = (integer: string): string => {
  if (integer.length <= 3) return integer;
  const last3 = integer.slice(-3);
  const rest = integer.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
};

/**
 * "Rs. 12,500" / "Rs. 12,500.50". Display only: the amounts come from the API
 * already calculated (money maths stays in the backend ledger).
 */
export const formatMoney = (value: number | string | null | undefined, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const negative = n < 0;
  const [int = "0", frac = "00"] = Math.abs(n).toFixed(2).split(".");
  const text = `Rs. ${groupIndian(int)}${frac === "00" ? "" : `.${frac}`}`;
  return negative ? `-${text}` : text;
};

/** "1,234" with Indian grouping. */
export const formatNumber = (value: number | string | null | undefined, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const [int = "0", frac] = String(Math.abs(n)).split(".");
  return `${n < 0 ? "-" : ""}${groupIndian(int)}${frac ? `.${frac}` : ""}`;
};

/** "92.5%" from a number or numeric string; the API decides the value. */
export const formatPercent = (value: number | string | null | undefined, digits = 1, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? `${Number(n.toFixed(digits))}%` : fallback;
};
