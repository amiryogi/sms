/**
 * Bikram Sambat (BS) <-> AD conversion for the server.
 *
 * This is the only file that requires the conversion package
 * (@inicrea/bikram-sambat-core: month lengths generated from the Yorion engine,
 * BS 1975-2100). Everything else calls these functions, so the package can be
 * replaced here without touching a controller. The frontend has the same
 * functions in frontend/src/lib/calendar/bsDateAdapter.js.
 *
 * A calendar date is a "YYYY-MM-DD" string (AD) or { year, month, day } (BS,
 * month 1 = Baisakh). It never passes through a local-time Date, so the result
 * does not depend on the server's timezone. Functions return null for a value
 * that is not a date or is outside the supported range; they do not throw.
 */
const core = require("@inicrea/bikram-sambat-core");

const MIN_BS_YEAR = core.MIN_BS_YEAR; // 1975
const MAX_BS_YEAR = core.MAX_BS_YEAR; // 2100
const MIN_AD = core.EPOCH_AD_ISO; // "1918-04-13" = 1975-01-01 BS
const MAX_AD = core.MAX_AD_ISO; // "2044-04-12" = 2100-12-30 BS

const DAY_MS = 86400000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const KATHMANDU_OFFSET_MINUTES = 5 * 60 + 45;

/** True for a real AD calendar date written "YYYY-MM-DD" (2026-02-30 is not one). */
const isIsoDate = (value) => {
  if (typeof value !== "string") return false;
  const m = ISO_DAY.exec(value);
  if (!m) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/** True when the AD date can be converted (inside BS 1975-2100). */
const isSupportedAd = (iso) => isIsoDate(iso) && iso >= MIN_AD && iso <= MAX_AD;

/** True for a real BS date inside the supported range. */
const isValidBs = (bs) =>
  !!bs &&
  Number.isInteger(bs.year) &&
  Number.isInteger(bs.month) &&
  Number.isInteger(bs.day) &&
  core.isValidBsDate(bs);

/** AD "YYYY-MM-DD" -> { year, month, day } in BS, or null. */
const adToBs = (iso) => {
  if (!isSupportedAd(iso)) return null;
  const bs = core.adToBs(iso);
  return { year: bs.year, month: bs.month, day: bs.day };
};

/** BS { year, month, day } -> AD "YYYY-MM-DD", or null. */
const bsToAd = (bs) => (isValidBs(bs) ? core.bsToAdIso({ year: bs.year, month: bs.month, day: bs.day }) : null);

/** Days in a BS month (29-32), or null outside the table. */
const daysInBsMonth = (year, month) => {
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (year < MIN_BS_YEAR || year > MAX_BS_YEAR || month < 1 || month > 12) return null;
  return core.daysInBsMonth(year, month);
};

/** Weekday of an AD date, 0 = Sunday ... 6 = Saturday, or null. */
const weekdayOf = (iso) => (isIsoDate(iso) ? new Date(`${iso}T00:00:00.000Z`).getUTCDay() : null);

/** Weekday of a BS date, 0 = Sunday ... 6 = Saturday, or null. */
const bsWeekday = (bs) => weekdayOf(bsToAd(bs));

/** The AD date `days` after (or before, when negative) an AD date. */
const addDays = (iso, days) => {
  if (!isIsoDate(iso) || !Number.isInteger(days)) return null;
  return new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
};

/** Whole days from one AD date to another (negative when `to` is earlier). */
const diffDays = (from, to) => {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);
};

/** First and last AD dates of a BS month: { from, to }, or null. */
const bsMonthRange = (year, month) => {
  const days = daysInBsMonth(year, month);
  if (!days) return null;
  return { from: bsToAd({ year, month, day: 1 }), to: bsToAd({ year, month, day: days }) };
};

/** First and last AD dates of a BS year: { from, to }, or null. */
const bsYearRange = (year) => {
  const first = bsMonthRange(year, 1);
  const last = bsMonthRange(year, 12);
  return first && last ? { from: first.from, to: last.to } : null;
};

/** Today's calendar date in Nepal as AD "YYYY-MM-DD", whatever the server's timezone. */
const todayAd = (now = new Date()) =>
  new Date(now.getTime() + KATHMANDU_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);

/** Today's calendar date in Nepal in BS. */
const todayBs = (now = new Date()) => adToBs(todayAd(now));

module.exports = {
  MIN_BS_YEAR,
  MAX_BS_YEAR,
  MIN_AD,
  MAX_AD,
  isIsoDate,
  isSupportedAd,
  isValidBs,
  adToBs,
  bsToAd,
  daysInBsMonth,
  weekdayOf,
  bsWeekday,
  addDays,
  diffDays,
  bsMonthRange,
  bsYearRange,
  todayAd,
  todayBs,
};
