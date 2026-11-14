/**
 * Reading calendar dates from requests and database rows without a timezone
 * shift.
 *
 * A DATE column (@db.Date) holds a calendar day; Prisma hands it over as
 * midnight UTC. `new Date("2026-04-14T00:00:00+05:45")`, or a browser's
 * local-midnight toISOString(), names the previous UTC day, so these helpers
 * read the date's own digits instead of converting an instant.
 */
const { isIsoDate } = require("./bsDateAdapter");

const LEADING_DAY = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/;

/**
 * "YYYY-MM-DD" from a date string, a full ISO timestamp (its date part) or a
 * Date read from a DATE column (its UTC day). Null when it is not a real date.
 */
const toIsoDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string") return null;
  const match = LEADING_DAY.exec(value.trim());
  return match && isIsoDate(match[1]) ? match[1] : null;
};

/** The UTC-midnight Date Prisma stores in a DATE column, or null. */
const parseDateOnly = (value) => {
  const iso = toIsoDate(value);
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
};

/** True when the value names a real calendar date. */
const isDateOnly = (value) => toIsoDate(value) !== null;

/** True when `iso` lies in [min, max]; either bound may be left out. */
const isWithin = (iso, min, max) => {
  if (!isIsoDate(iso)) return false;
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
};

/** Checks a from/to pair. Returns an error message, or null when it is fine. */
const rangeError = (from, to, { maxDays } = {}) => {
  if (!isIsoDate(from) || !isIsoDate(to)) return "Dates must be written YYYY-MM-DD";
  if (to < from) return "The end date cannot be before the start date";
  if (maxDays) {
    const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
    if (days > maxDays) return `The range cannot be longer than ${maxDays} days`;
  }
  return null;
};

/** "HH:mm" (24 hour), or null. */
const toTimeOfDay = (value) => {
  if (typeof value !== "string") return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? `${m[1]}:${m[2]}` : null;
};

module.exports = { toIsoDate, parseDateOnly, isDateOnly, isWithin, rangeError, toTimeOfDay };
